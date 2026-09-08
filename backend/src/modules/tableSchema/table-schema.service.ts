import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes, Transaction } from 'sequelize';
import { UiTable } from './models/ui-table.model';
import { UiTableColumn } from './models/ui-table-column.model';
import { AddColumnDto } from './dto/add-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { SchemaSyncService } from './schema-sync.service';
import { AuditLogService } from '../auditLog/auditLog.service';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { Role } from '../roles/models/roles.model';
import {
  FIELD_KIND_EMPLOYEE_REF,
  FIELD_KIND_ROLE_REF,
  FIELD_KIND_TEXT,
  MAX_CUSTOM_COLUMNS,
  TEXT_MAX_LENGTH,
  EMPLOYEE_REFERENCE_TABLE,
  ROLE_REFERENCE_TABLE,
  ALLOWED_CUSTOM_FIELD_KINDS,
  DEPARTMENT_TABLE_CODE,
} from './table-schema.constants';

export type SchemaColumnDto = {
  id: number;
  name: string;
  code: string;
  field_kind: string;
  data_type: string;
  reference_table: string | null;
  role_id: number | null;
  role_name: string | null;
  role_code: string | null;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
};

export type CustomFieldValue = {
  value: string | null;
  display: string | null;
};

@Injectable()
export class TableSchemaService {
  constructor(
    @InjectModel(UiTable)
    private uiTableModel: typeof UiTable,
    @InjectModel(UiTableColumn)
    private uiTableColumnModel: typeof UiTableColumn,
    @InjectModel(EmployeeDetails)
    private employeeModel: typeof EmployeeDetails,
    @InjectModel(Role)
    private roleModel: typeof Role,
    private schemaSyncService: SchemaSyncService,
    private auditLogService: AuditLogService,
  ) {}

  async getTableSchema(tableCode: string): Promise<any> {
    const table = await this.uiTableModel.findOne({
      where: { code: tableCode, is_active: true },
      include: [
        {
          model: UiTableColumn,
          where: { is_active: true },
          required: false,
          include: [{ model: Role, required: false }],
        },
      ],
    });

    if (!table) {
      throw new HttpException(`Table schema "${tableCode}" not found.`, 404);
    }

    const columns = (table.columns || []).sort((a, b) => a.display_order - b.display_order);
    const rowCount = await this.getRowCount(table.physical_table_name);

    return {
      success: true,
      data: {
        table: {
          name: table.name,
          code: table.code,
          column_count: columns.length,
          row_count: rowCount,
        },
        columns: columns.map((col) => this.toColumnDto(col)),
      },
    };
  }

  async addColumn(tableCode: string, dto: AddColumnDto, reqUser: any): Promise<any> {
    const table = await this.uiTableModel.findOne({ where: { code: tableCode, is_active: true } });
    if (!table) {
      throw new HttpException(`Table schema "${tableCode}" not found.`, 404);
    }

    if (!dto.name?.trim()) {
      throw new HttpException('Column name is required.', 400);
    }

    if (tableCode === DEPARTMENT_TABLE_CODE) {
      if (dto.field_kind !== FIELD_KIND_ROLE_REF) {
        throw new HttpException('Department columns must use field_kind "role_ref".', 400);
      }
    } else if (!ALLOWED_CUSTOM_FIELD_KINDS.includes(dto.field_kind as any)) {
      throw new HttpException('field_kind must be "text", "employee_ref", or "role_ref".', 400);
    } else if (dto.field_kind === FIELD_KIND_ROLE_REF) {
      throw new HttpException('role_ref columns are only supported for the department table.', 400);
    }

    let normalizedCode: string;

    if (dto.field_kind === FIELD_KIND_ROLE_REF) {
      normalizedCode = this.schemaSyncService.buildRoleColumnCode(dto.name);
      this.schemaSyncService.assertValidRoleColumnCode(normalizedCode);
    } else if (dto.field_kind === FIELD_KIND_EMPLOYEE_REF) {
      normalizedCode = this.schemaSyncService.buildEmployeeColumnCode(dto.name);
      this.schemaSyncService.assertValidEmployeeColumnCode(normalizedCode);
    } else {
      if (!dto.code?.trim()) {
        throw new HttpException('Column code is required.', 400);
      }
      normalizedCode = this.schemaSyncService.normalizeColumnCode(dto.code);
      this.schemaSyncService.assertValidColumnCode(normalizedCode);
    }

    const customCount = await this.uiTableColumnModel.count({
      where: { table_id: table.id, is_system: false, is_active: true },
    });
    if (customCount >= MAX_CUSTOM_COLUMNS) {
      throw new HttpException(`Maximum of ${MAX_CUSTOM_COLUMNS} custom columns reached.`, 400);
    }

    const existing = await this.uiTableColumnModel.findOne({
      where: { table_id: table.id, code: normalizedCode },
    });
    if (existing) {
      throw new HttpException(`Column code "${normalizedCode}" already exists.`, 400);
    }

    const dataType =
      dto.field_kind === FIELD_KIND_EMPLOYEE_REF
        ? 'uuid'
        : dto.field_kind === FIELD_KIND_ROLE_REF
          ? 'integer'
          : 'varchar';
    const referenceTable =
      dto.field_kind === FIELD_KIND_EMPLOYEE_REF
        ? EMPLOYEE_REFERENCE_TABLE
        : dto.field_kind === FIELD_KIND_ROLE_REF
          ? ROLE_REFERENCE_TABLE
          : null;
    const maxOrder = (await this.uiTableColumnModel.max('display_order', {
      where: { table_id: table.id },
    })) as number | null;

    const sequelize = this.uiTableColumnModel.sequelize!;
    const transaction = await sequelize.transaction();

    try {
      const column = await this.uiTableColumnModel.create(
        {
          table_id: table.id,
          name: dto.name.trim(),
          code: normalizedCode,
          field_kind: dto.field_kind,
          data_type: dataType,
          reference_table: referenceTable,
          db_column_name: normalizedCode,
          role_id: null,
          is_system: false,
          is_active: true,
          display_order: (maxOrder ?? 0) + 1,
        },
        { transaction },
      );

      await this.schemaSyncService.applyCustomColumnDdl(
        table.physical_table_name,
        column.db_column_name,
        column.field_kind,
        transaction,
      );

      await transaction.commit();

      const created = await this.uiTableColumnModel.findByPk(column.id, {
        include: [{ model: Role, required: false }],
      });

      try {
        await this.auditLogService.create({
          actor_id: reqUser?.id || 1,
          action: 'CREATE',
          entity_type: 'TableSchemaColumn',
          entity_id: `TSC-${column.id}`,
          metadata: `Added ${dto.field_kind} column "${column.name}" (${column.code}) to ${table.name}`,
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      return {
        success: true,
        message: 'Column added successfully',
        data: this.toColumnDto(created ?? column),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateColumn(
    tableCode: string,
    columnId: number,
    dto: UpdateColumnDto,
    reqUser: any,
  ): Promise<any> {
    const table = await this.uiTableModel.findOne({ where: { code: tableCode, is_active: true } });
    if (!table) {
      throw new HttpException(`Table schema "${tableCode}" not found.`, 404);
    }

    if (!dto.name?.trim()) {
      throw new HttpException('Column name is required.', 400);
    }

    const column = await this.uiTableColumnModel.findOne({
      where: { id: columnId, table_id: table.id, is_active: true },
    });

    if (!column) {
      throw new HttpException('Column not found.', 404);
    }

    if (column.is_system) {
      throw new HttpException('System columns cannot be edited.', 400);
    }

    await column.update({ name: dto.name.trim() });

    const refreshed = await this.uiTableColumnModel.findByPk(column.id, {
      include: [{ model: Role, required: false }],
    });

    try {
      await this.auditLogService.create({
        actor_id: reqUser?.id || 1,
        action: 'UPDATE',
        entity_type: 'TableSchemaColumn',
        entity_id: `TSC-${column.id}`,
        metadata: `Renamed column "${column.code}" to "${column.name}" on ${table.name}`,
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return {
      success: true,
      message: 'Column updated successfully',
      data: this.toColumnDto(refreshed ?? column),
    };
  }

  async deleteColumn(tableCode: string, columnId: number, reqUser: any): Promise<any> {
    const table = await this.uiTableModel.findOne({ where: { code: tableCode, is_active: true } });
    if (!table) {
      throw new HttpException(`Table schema "${tableCode}" not found.`, 404);
    }

    const column = await this.uiTableColumnModel.findOne({
      where: { id: columnId, table_id: table.id, is_active: true },
    });

    if (!column) {
      throw new HttpException('Column not found.', 404);
    }

    if (column.is_system) {
      throw new HttpException('System columns cannot be deleted.', 400);
    }

    const filledCount = await this.schemaSyncService.countFilledRows(
      table.physical_table_name,
      column.db_column_name,
      column.field_kind,
    );

    if (filledCount > 0) {
      throw new HttpException(
        `Cannot delete this column. It still has data in ${filledCount} row(s). Clear those values first.`,
        400,
      );
    }

    const sequelize = this.uiTableColumnModel.sequelize!;
    const transaction = await sequelize.transaction();
    const columnName = column.name;
    const columnCode = column.code;

    try {
      await this.schemaSyncService.dropCustomColumnDdl(
        table.physical_table_name,
        column.db_column_name,
        column.field_kind,
        transaction,
      );

      await column.destroy({ transaction });
      await transaction.commit();

      try {
        await this.auditLogService.create({
          actor_id: reqUser?.id || 1,
          action: 'DELETE',
          entity_type: 'TableSchemaColumn',
          entity_id: `TSC-${columnId}`,
          metadata: `Deleted ${column.field_kind} column "${columnName}" (${columnCode}) from ${table.name}`,
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      return {
        success: true,
        message: 'Column deleted successfully',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getActiveCustomColumns(tableCode: string): Promise<UiTableColumn[]> {
    const table = await this.uiTableModel.findOne({ where: { code: tableCode, is_active: true } });
    if (!table) return [];

    return this.uiTableColumnModel.findAll({
      where: { table_id: table.id, is_system: false, is_active: true },
      include: [{ model: Role, required: false }],
      order: [['display_order', 'ASC']],
    });
  }

  async getActiveRoleColumns(tableCode: string): Promise<UiTableColumn[]> {
    const columns = await this.getActiveCustomColumns(tableCode);
    return columns.filter((col) => col.field_kind === FIELD_KIND_ROLE_REF);
  }

  async readCustomFields(
    physicalTableName: string,
    recordIds: number[],
    columns: UiTableColumn[],
  ): Promise<Map<number, Record<string, CustomFieldValue>>> {
    const result = new Map<number, Record<string, CustomFieldValue>>();
    if (!recordIds.length || !columns.length) return result;

    const sequelize = this.uiTableColumnModel.sequelize!;
    const selectParts = columns.map((col) => this.quoteIdent(col.db_column_name));
    const idList = recordIds.join(',');

    const rows = await sequelize.query<Record<string, unknown>>(
      `SELECT id, ${selectParts.join(', ')} FROM ${this.quoteIdent(physicalTableName)} WHERE id IN (${idList})`,
      { type: QueryTypes.SELECT },
    );

    const employeeIds = new Set<string>();
    const roleIds = new Set<number>();
    for (const row of rows) {
      for (const col of columns) {
        if (col.field_kind === FIELD_KIND_EMPLOYEE_REF && row[col.db_column_name]) {
          employeeIds.add(String(row[col.db_column_name]));
        }
        if (col.field_kind === FIELD_KIND_ROLE_REF && row[col.db_column_name]) {
          roleIds.add(Number(row[col.db_column_name]));
        }
      }
    }

    const employeeNameMap = await this.resolveEmployeeNames([...employeeIds]);
    const roleNameMap = await this.resolveRoleNames([...roleIds]);

    for (const row of rows) {
      const recordId = Number(row.id);
      const fields: Record<string, CustomFieldValue> = {};
      for (const col of columns) {
        const raw = row[col.db_column_name];
        const value = raw == null || raw === '' ? null : String(raw);
        let display: string | null = value;
        if (col.field_kind === FIELD_KIND_EMPLOYEE_REF) {
          display = value ? (employeeNameMap.get(value) ?? null) : null;
        }
        if (col.field_kind === FIELD_KIND_ROLE_REF) {
          display = value ? (roleNameMap.get(Number(value)) ?? null) : null;
        }
        fields[col.code] = { value, display };
      }
      result.set(recordId, fields);
    }

    return result;
  }

  async readCustomFieldsForDepartments(
    departmentIds: number[],
    columns: UiTableColumn[],
  ): Promise<Map<number, Record<string, CustomFieldValue>>> {
    return this.readCustomFields('departments', departmentIds, columns);
  }

  async writeCustomFields(
    physicalTableName: string,
    recordId: number,
    customFields: Record<string, string | null | undefined>,
    columns: UiTableColumn[],
    transaction: Transaction,
  ): Promise<void> {
    if (!columns.length) return;

    const normalized = await this.validateAndNormalizeCustomFields(customFields, columns);
    const setClauses: string[] = [];
    const replacements: Record<string, unknown> = { recordId };

    for (const col of columns) {
      const paramKey = `col_${col.code}`;
      setClauses.push(`${this.quoteIdent(col.db_column_name)} = :${paramKey}`);
      replacements[paramKey] = normalized[col.code] ?? null;
    }

    const sequelize = this.uiTableColumnModel.sequelize!;
    await sequelize.query(
      `UPDATE ${this.quoteIdent(physicalTableName)} SET ${setClauses.join(', ')} WHERE id = :recordId`,
      { replacements, transaction, type: QueryTypes.UPDATE },
    );
  }

  async validateAndNormalizeCustomFields(
    customFields: Record<string, string | null | undefined> | undefined,
    columns: UiTableColumn[],
  ): Promise<Record<string, string | null>> {
    const normalized: Record<string, string | null> = {};
    const input = customFields ?? {};
    const allowedCodes = new Set(columns.map((c) => c.code));

    for (const key of Object.keys(input)) {
      if (!allowedCodes.has(key)) {
        throw new HttpException(`Unknown custom field "${key}".`, 400);
      }
    }

    for (const col of columns) {
      const raw = input[col.code];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        normalized[col.code] = null;
        continue;
      }

      const value = String(raw).trim();

      if (col.field_kind === FIELD_KIND_TEXT) {
        if (value.length > TEXT_MAX_LENGTH) {
          throw new HttpException(`"${col.name}" must be at most ${TEXT_MAX_LENGTH} characters.`, 400);
        }
        normalized[col.code] = value;
        continue;
      }

      if (col.field_kind === FIELD_KIND_EMPLOYEE_REF) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new HttpException(`"${col.name}" requires a valid employee selection.`, 400);
        }
        const employee = await this.employeeModel.findByPk(value);
        if (!employee) {
          throw new HttpException(`Selected employee for "${col.name}" was not found.`, 400);
        }
        if (!employee.is_active) {
          throw new HttpException(`Selected employee for "${col.name}" is inactive.`, 400);
        }
        normalized[col.code] = value;
        continue;
      }

      if (col.field_kind === FIELD_KIND_ROLE_REF) {
        const roleId = Number(value);
        if (!Number.isInteger(roleId) || roleId <= 0) {
          throw new HttpException(`"${col.name}" requires a valid role selection.`, 400);
        }
        const role = await this.roleModel.findByPk(roleId);
        if (!role) {
          throw new HttpException(`Selected role for "${col.name}" was not found.`, 400);
        }
        if (!role.is_active) {
          throw new HttpException(`Selected role for "${col.name}" is inactive.`, 400);
        }
        normalized[col.code] = String(roleId);
        continue;
      }

      throw new HttpException(`Unsupported field kind for "${col.name}".`, 400);
    }

    return normalized;
  }

  attachCustomFieldsToRecords<T extends { id: number }>(
    records: T[],
    customFieldMap: Map<number, Record<string, CustomFieldValue>>,
  ): (T & { custom_fields: Record<string, CustomFieldValue> })[] {
    return records.map((record) => ({
      ...record,
      custom_fields: customFieldMap.get(record.id) ?? {},
    }));
  }

  private async getRowCount(physicalTableName: string): Promise<number> {
    const sequelize = this.uiTableColumnModel.sequelize!;
    const rows = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${this.quoteIdent(physicalTableName)}`,
      { type: QueryTypes.SELECT },
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  private async resolveRoleNames(ids: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!ids.length) return map;

    const roles = await this.roleModel.findAll({
      where: { id: ids },
      attributes: ['id', 'name'],
    });
    for (const role of roles) {
      map.set(role.id, role.name);
    }
    return map;
  }

  private async resolveEmployeeNames(ids: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!ids.length) return map;

    const employees = await this.employeeModel.findAll({
      where: { id: ids },
      attributes: ['id', 'name'],
    });
    for (const emp of employees) {
      map.set(emp.id, emp.name);
    }
    return map;
  }

  private quoteIdent(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private toColumnDto(col: UiTableColumn): SchemaColumnDto {
    return {
      id: col.id,
      name: col.name,
      code: col.code,
      field_kind: col.field_kind,
      data_type: col.data_type,
      reference_table: col.reference_table ?? null,
      role_id: col.role_id ?? null,
      role_name: col.role?.name ?? null,
      role_code: col.role?.code ?? null,
      is_system: col.is_system,
      is_active: col.is_active,
      display_order: col.display_order,
    };
  }
}
