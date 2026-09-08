import { HttpException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { UiTable } from './models/ui-table.model';
import { UiTableColumn } from './models/ui-table-column.model';
import {
  EMPLOYEE_REFERENCE_TABLE,
  FIELD_KIND_EMPLOYEE_REF,
  FIELD_KIND_ROLE_REF,
  FIELD_KIND_TEXT,
  RESERVED_COLUMN_CODES,
  COLUMN_CODE_REGEX,
  EMPLOYEE_COLUMN_CODE_REGEX,
  ROLE_COLUMN_CODE_REGEX,
  ROLE_REFERENCE_TABLE,
} from './table-schema.constants';
import { KNOWN_UI_TABLES } from './ui-table-registry.constants';

@Injectable()
export class SchemaSyncService implements OnModuleInit {
  constructor(
    @InjectModel(UiTable)
    private uiTableModel: typeof UiTable,
    @InjectModel(UiTableColumn)
    private uiTableColumnModel: typeof UiTableColumn,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.reconcileKnownUiTables();
      await this.reconcileAllCustomColumns();
    } catch (error) {
      console.error('SchemaSyncService startup reconcile failed:', error);
    }
  }

  async reconcileKnownUiTables(): Promise<void> {
    for (const def of KNOWN_UI_TABLES) {
      const [table] = await this.uiTableModel.findOrCreate({
        where: { code: def.code },
        defaults: {
          name: def.name,
          code: def.code,
          physical_table_name: def.physical_table_name,
          is_active: true,
        },
      });

      for (const col of def.system_columns) {
        await this.uiTableColumnModel.findOrCreate({
          where: { table_id: table.id, code: col.code },
          defaults: {
            table_id: table.id,
            name: col.name,
            code: col.code,
            field_kind: col.field_kind,
            data_type: col.data_type,
            reference_table: col.reference_table,
            db_column_name: col.db_column_name,
            is_system: true,
            is_active: true,
            display_order: col.display_order,
            ui_config: null,
          },
        });
      }
    }
  }

  normalizeColumnCode(input: string): string {
    return input
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  normalizeNameSlug(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  buildEmployeeColumnCode(displayName: string): string {
    const slug = this.normalizeNameSlug(displayName);
    if (!slug) {
      throw new HttpException('Column name must contain letters or numbers.', 400);
    }
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      throw new HttpException(
        'Column name must start with a letter for employee columns.',
        400,
      );
    }
    return `default_${slug}_employee_id`;
  }

  assertValidColumnCode(code: string): void {
    const normalized = this.normalizeColumnCode(code);
    if (!COLUMN_CODE_REGEX.test(normalized)) {
      throw new HttpException(
        'Column code must start with a letter and contain only uppercase letters, numbers, and underscores.',
        400,
      );
    }
    if (RESERVED_COLUMN_CODES.has(normalized.toLowerCase())) {
      throw new HttpException(`Column code "${normalized}" is reserved and cannot be used.`, 400);
    }
  }

  buildRoleColumnCode(displayName: string): string {
    const slug = this.normalizeNameSlug(displayName);
    if (!slug) {
      throw new HttpException('Column name must contain letters or numbers.', 400);
    }
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      throw new HttpException(
        'Column name must start with a letter for role columns.',
        400,
      );
    }
    return `default_${slug}_role_id`;
  }

  assertValidRoleColumnCode(code: string): void {
    const normalized = code.toLowerCase();
    if (!ROLE_COLUMN_CODE_REGEX.test(normalized)) {
      throw new HttpException(
        'Role column code must follow default_{name}_role_id format.',
        400,
      );
    }
    if (RESERVED_COLUMN_CODES.has(normalized)) {
      throw new HttpException(`Column code "${normalized}" is reserved and cannot be used.`, 400);
    }

    const slugMatch = normalized.match(/^default_(.+)_role_id$/);
    const slug = slugMatch?.[1];
    if (slug && RESERVED_COLUMN_CODES.has(slug)) {
      throw new HttpException(
        `Column name "${slug}" is reserved and cannot be used in a role column.`,
        400,
      );
    }
  }

  assertValidEmployeeColumnCode(code: string): void {
    const normalized = code.toLowerCase();
    if (!EMPLOYEE_COLUMN_CODE_REGEX.test(normalized)) {
      throw new HttpException(
        'Employee column code must follow default_{name}_employee_id format.',
        400,
      );
    }
    if (RESERVED_COLUMN_CODES.has(normalized)) {
      throw new HttpException(`Column code "${normalized}" is reserved and cannot be used.`, 400);
    }

    const slugMatch = normalized.match(/^default_(.+)_employee_id$/);
    const slug = slugMatch?.[1];
    if (slug && RESERVED_COLUMN_CODES.has(slug)) {
      throw new HttpException(
        `Column name "${slug}" is reserved and cannot be used in an employee column.`,
        400,
      );
    }
  }

  private getSequelize(): Sequelize {
    const sequelize = this.uiTableColumnModel.sequelize;
    if (!sequelize) {
      throw new HttpException('Database connection unavailable.', 500);
    }
    return sequelize;
  }

  private quoteIdent(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private fkConstraintName(physicalTable: string, columnCode: string): string {
    const raw = `${physicalTable}_${columnCode}_fkey`;
    return raw.slice(0, 63);
  }

  private async constraintExists(
    sequelize: Sequelize,
    constraintName: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const rows = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = :constraintName
      ) AS exists`,
      {
        replacements: { constraintName },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return Boolean(rows[0]?.exists);
  }

  async applyCustomColumnDdl(
    physicalTableName: string,
    dbColumnName: string,
    fieldKind: string,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.getSequelize();
    const tableIdent = this.quoteIdent(physicalTableName);
    const columnIdent = this.quoteIdent(dbColumnName);

    if (fieldKind === FIELD_KIND_TEXT) {
      await sequelize.query(
        `ALTER TABLE ${tableIdent} ADD COLUMN IF NOT EXISTS ${columnIdent} VARCHAR(255) NULL`,
        { transaction },
      );
      return;
    }

    if (fieldKind === FIELD_KIND_EMPLOYEE_REF) {
      await sequelize.query(
        `ALTER TABLE ${tableIdent} ADD COLUMN IF NOT EXISTS ${columnIdent} UUID NULL`,
        { transaction },
      );

      const constraintName = this.fkConstraintName(physicalTableName, dbColumnName);
      const exists = await this.constraintExists(sequelize, constraintName, transaction);
      if (!exists) {
        await sequelize.query(
          `ALTER TABLE ${tableIdent}
           ADD CONSTRAINT ${this.quoteIdent(constraintName)}
           FOREIGN KEY (${columnIdent}) REFERENCES ${this.quoteIdent(EMPLOYEE_REFERENCE_TABLE)}(id)
           ON DELETE SET NULL ON UPDATE CASCADE`,
          { transaction },
        );
      }
      return;
    }

    if (fieldKind === FIELD_KIND_ROLE_REF) {
      await sequelize.query(
        `ALTER TABLE ${tableIdent} ADD COLUMN IF NOT EXISTS ${columnIdent} INTEGER NULL`,
        { transaction },
      );

      const constraintName = this.fkConstraintName(physicalTableName, dbColumnName);
      const exists = await this.constraintExists(sequelize, constraintName, transaction);
      if (!exists) {
        await sequelize.query(
          `ALTER TABLE ${tableIdent}
           ADD CONSTRAINT ${this.quoteIdent(constraintName)}
           FOREIGN KEY (${columnIdent}) REFERENCES ${this.quoteIdent(ROLE_REFERENCE_TABLE)}(id)
           ON DELETE SET NULL ON UPDATE CASCADE`,
          { transaction },
        );
      }
      return;
    }

    throw new HttpException(`Unsupported field kind: ${fieldKind}`, 400);
  }

  async countFilledRows(
    physicalTableName: string,
    dbColumnName: string,
    fieldKind: string,
  ): Promise<number> {
    const sequelize = this.getSequelize();
    const tableIdent = this.quoteIdent(physicalTableName);
    const columnIdent = this.quoteIdent(dbColumnName);

    let condition: string;
    if (fieldKind === FIELD_KIND_TEXT) {
      condition = `${columnIdent} IS NOT NULL AND TRIM(${columnIdent}) <> ''`;
    } else if (fieldKind === FIELD_KIND_EMPLOYEE_REF) {
      condition = `${columnIdent} IS NOT NULL`;
    } else if (fieldKind === FIELD_KIND_ROLE_REF) {
      condition = `${columnIdent} IS NOT NULL`;
    } else {
      throw new HttpException(`Unsupported field kind: ${fieldKind}`, 400);
    }

    const rows = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${tableIdent} WHERE ${condition}`,
      { type: QueryTypes.SELECT },
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async dropCustomColumnDdl(
    physicalTableName: string,
    dbColumnName: string,
    fieldKind: string,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.getSequelize();
    const tableIdent = this.quoteIdent(physicalTableName);
    const columnIdent = this.quoteIdent(dbColumnName);

    if (fieldKind === FIELD_KIND_EMPLOYEE_REF || fieldKind === FIELD_KIND_ROLE_REF) {
      const constraintName = this.fkConstraintName(physicalTableName, dbColumnName);
      const exists = await this.constraintExists(sequelize, constraintName, transaction);
      if (exists) {
        await sequelize.query(
          `ALTER TABLE ${tableIdent} DROP CONSTRAINT ${this.quoteIdent(constraintName)}`,
          { transaction },
        );
      }
    }

    await sequelize.query(
      `ALTER TABLE ${tableIdent} DROP COLUMN IF EXISTS ${columnIdent}`,
      { transaction },
    );
  }

  async reconcileAllCustomColumns(): Promise<void> {
    const columns = await this.uiTableColumnModel.findAll({
      where: { is_system: false, is_active: true },
      include: [{ model: UiTable, required: true, where: { is_active: true } }],
    });

    for (const column of columns) {
      const physicalTable = column.table?.physical_table_name;
      if (!physicalTable) continue;
      await this.applyCustomColumnDdl(physicalTable, column.db_column_name, column.field_kind);
    }
  }
}
