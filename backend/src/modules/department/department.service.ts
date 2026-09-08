import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Department } from "./models/department.model";
import { DepartmentDto } from "./dto/department.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Op } from "sequelize";
import { verifyAdmin, isAdminUser } from "../../auth/verifyRoles";
import { EmployeeDetails } from "../employeeDetails/models/employeeDetails.model";
import { UserAccount } from "../userAccount/models/user.model";
import { AuditLogService } from "../auditLog/auditLog.service";
import { TableSchemaService } from "../tableSchema/table-schema.service";
import { paginate } from "../../utils/pagination";
import { buildSearchWhere } from "src/utils/search.utils";
import { checkRecordReferences } from "../../utils/db.utils";
import { Role } from "../roles/models/roles.model";
import { employeeHasRoleCode, getEmployeeRoleId } from "../../utils/employee-role.utils";

export type DepartmentAssignmentSummary = {
    id: number;
    name: string;
    code: string;
};

@Injectable()
export class DepartmentService {
    constructor(
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(EmployeeDetails)
        private employeeModel: typeof EmployeeDetails,
        @InjectModel(UserAccount)
        private userAccountModel: typeof UserAccount,
        @InjectModel(Role)
        private roleModel: typeof Role,
        private auditLogService: AuditLogService,
        private tableSchemaService: TableSchemaService,
    ) { }

    private splitDepartmentPayload(data: DepartmentDto | Partial<DepartmentDto>): {
        systemFields: Partial<DepartmentDto>;
        customFields?: Record<string, string | null>;
    } {
        const { custom_fields, ...rest } = data as DepartmentDto & {
            custom_fields?: Record<string, string | null>;
        };
        return {
            systemFields: rest,
            customFields: custom_fields,
        };
    }

    private async shouldIncludeCustomFields(
        requested: boolean,
        reqUser?: any,
    ): Promise<boolean> {
        if (!requested) return false;
        return isAdminUser(reqUser);
    }

    private serializeDepartmentRecord(record: any): any {
        if (!record) return record;
        const plain = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
        return plain;
    }

    private async resolveEmployeeFromUser(reqUser: any): Promise<EmployeeDetails> {
        const user = await this.userAccountModel.findByPk(reqUser.id);
        if (!user?.email) {
            throw new HttpException('Unable to resolve employee user account.', 403);
        }
        const employee = await this.employeeModel.findOne({
            where: { email: { [Op.iLike]: user.email } },
        });
        if (!employee) {
            throw new HttpException('Employee profile not found.', 403);
        }
        return employee;
    }

    private mapDepartmentAssignments(departments: Department[]): DepartmentAssignmentSummary[] {
        return departments
            .map((dept) => ({
                id: dept.id,
                name: dept.name,
                code: dept.code,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    private async loadRolesForEmployee(employee: EmployeeDetails) {
        const roleId = getEmployeeRoleId(employee);
        if (!roleId) {
            return [];
        }
        return this.roleModel.findAll({ where: { id: roleId, is_active: true } });
    }

    async getMyAssignments(reqUser: any): Promise<any> {
        try {
            const employee = await this.resolveEmployeeFromUser(reqUser);
            const roles = await this.loadRolesForEmployee(employee);

            const isHod = employeeHasRoleCode(employee, 'HOD', roles);
            const isCoordinator = employeeHasRoleCode(employee, 'COORDINATOR', roles);

            let assignedDepartment: Department | null = null;
            if (employee.department_id) {
                assignedDepartment = await this.departmentModel.findOne({
                    where: {
                        id: employee.department_id,
                        is_active: true,
                    },
                    attributes: ['id', 'name', 'code'],
                });
            }

            const hodDepartments = isHod && assignedDepartment ? [assignedDepartment] : [];
            const coordinatorDepartments = isCoordinator && assignedDepartment ? [assignedDepartment] : [];

            return {
                success: true,
                data: {
                    hod: this.mapDepartmentAssignments(hodDepartments),
                    coordinator: this.mapDepartmentAssignments(coordinatorDepartments),
                },
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async createDepartment(data: DepartmentDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { systemFields, customFields } = this.splitDepartmentPayload(data);
            const { name, code } = systemFields;

            if (!name || !code) {
                throw new HttpException('Department name and code are required', 400);
            }

            const existingDepartment = await this.departmentModel.findOne({
                where: { code }
            });

            if (existingDepartment) {
                throw new HttpException('Department with this code already exists', 400);
            }

            const customColumns = await this.tableSchemaService.getActiveCustomColumns('department');
            const sequelize = this.departmentModel.sequelize!;
            const transaction = await sequelize.transaction();

            try {
                const department = await this.departmentModel.create(systemFields as DepartmentDto, { transaction });

                if (customFields !== undefined && customColumns.length > 0) {
                    await this.tableSchemaService.writeCustomFields(
                        'departments',
                        department.id,
                        customFields,
                        customColumns,
                        transaction,
                    );
                }

                await transaction.commit();

                let responseData = this.serializeDepartmentRecord(department);
                if (customColumns.length > 0) {
                    const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments(
                        [department.id],
                        customColumns,
                    );
                    responseData = this.tableSchemaService.attachCustomFieldsToRecords(
                        [responseData],
                        customFieldMap,
                    )[0];
                }

                try {
                    await this.auditLogService.create({
                        actor_id: reqUser?.id || 1,
                        action: 'CREATE',
                        entity_type: 'Department',
                        entity_id: `DEP-${department.id}`,
                        metadata: `Created department "${department.name}"`
                    });
                } catch (auditError) {
                    console.error("Failed to create audit log:", auditError);
                }

                return {
                    success: true,
                    message: 'Department created successfully',
                    data: responseData,
                };
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllDepartments(
        page?: number | string,
        limit?: number | string,
        sortField?: string,
        sortOrder?: string,
        search?: string,
        includeCustomFields = false,
        reqUser?: any,
    ): Promise<any> {
        try {
            const allowedFields = ['name', 'code', 'is_active', 'createdAt'];
            const field = (sortField && allowedFields.includes(sortField)) ? sortField : 'name';
            const direction = sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            const result = await paginate(
                this.departmentModel,
                { where: { ...searchWhere }, order: [[field, direction]] },
                page,
                limit
            );

            const shouldInclude = await this.shouldIncludeCustomFields(includeCustomFields, reqUser);
            if (!shouldInclude || !result.data?.length) {
                return result;
            }

            const customColumns = await this.tableSchemaService.getActiveCustomColumns('department');
            if (!customColumns.length) {
                return result;
            }

            const ids = result.data.map((dept: any) => dept.id);
            const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments(ids, customColumns);
            const plainRows = result.data.map((dept: any) => this.serializeDepartmentRecord(dept));

            return {
                ...result,
                data: this.tableSchemaService.attachCustomFieldsToRecords(plainRows, customFieldMap),
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getDepartmentById(
        id: number,
        includeCustomFields = false,
        reqUser?: any,
    ): Promise<any> {
        try {
            const department = await this.departmentModel.findOne({
                where: { id, is_active: true }
            });
            if (!department) {
                throw new HttpException('Department not found or inactive', 404);
            }

            let responseData = this.serializeDepartmentRecord(department);
            const shouldInclude = await this.shouldIncludeCustomFields(includeCustomFields, reqUser);
            if (shouldInclude) {
                const customColumns = await this.tableSchemaService.getActiveCustomColumns('department');
                if (customColumns.length) {
                    const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments(
                        [id],
                        customColumns,
                    );
                    responseData = this.tableSchemaService.attachCustomFieldsToRecords(
                        [responseData],
                        customFieldMap,
                    )[0];
                }
            }

            return {
                success: true,
                message: 'Department fetched successfully',
                data: responseData,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateDepartment(id: number, data: Partial<DepartmentDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { systemFields, customFields } = this.splitDepartmentPayload(data);

            if (systemFields.code) {
                const existingDepartment = await this.departmentModel.findOne({
                    where: {
                        code: systemFields.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingDepartment) {
                    throw new HttpException('Department with this code already exists', 400);
                }
            }

            const customColumns = await this.tableSchemaService.getActiveCustomColumns('department');
            const sequelize = this.departmentModel.sequelize!;
            const transaction = await sequelize.transaction();

            let updatedDepartment: Department | null = null;

            try {
                const [affectedCount, departments] = await this.departmentModel.update(systemFields, {
                    where: { id },
                    returning: true,
                    transaction,
                });

                if (affectedCount === 0) {
                    throw new HttpException('Department not found', 404);
                }

                if (customFields !== undefined && customColumns.length > 0) {
                    await this.tableSchemaService.writeCustomFields(
                        'departments',
                        id,
                        customFields,
                        customColumns,
                        transaction,
                    );
                }

                await transaction.commit();
                updatedDepartment = departments[0];
            } catch (error) {
                await transaction.rollback();
                throw error;
            }

            let responseData = this.serializeDepartmentRecord(updatedDepartment);
            if (customColumns.length > 0) {
                const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments(
                    [id],
                    customColumns,
                );
                responseData = this.tableSchemaService.attachCustomFieldsToRecords(
                    [responseData],
                    customFieldMap,
                )[0];
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'Department',
                    entity_id: `DEP-${id}`,
                    metadata: `Updated department "${updatedDepartment?.name ?? id}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Department updated successfully',
                data: responseData,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    private async ensureDepartmentCanBeRemoved(
        id: number,
        action: 'deactivate' | 'delete',
    ): Promise<void> {
        const sequelize = this.departmentModel.sequelize!;

        const autoHandledTables = [
            'grievance_execution',
            'grievance_details',
            'notifications',
            'grievance_chats',
            'grievance_messages',
            'student_registration_requests',
        ];

        const refs = await checkRecordReferences(sequelize, 'departments', id);
        const referenceReasons = new Set<string>();
        for (const ref of refs.filter((r) => !autoHandledTables.includes(r.table))) {
            referenceReasons.add(ref.table);
        }

        if (referenceReasons.size > 0) {
            throw new HttpException(
                `Cannot ${action} this department. It is still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign those records first.`,
                400,
            );
        }

        try {
            await sequelize.query(
                `UPDATE grievance_details SET department = NULL WHERE department = :departmentId`,
                { replacements: { departmentId: id }, type: 'UPDATE' as any },
            );
        } catch (e) {
            console.error('Failed to clear department from grievance_details:', e);
        }
    }

    private async cleanupDepartmentReferencesBeforeDelete(id: number): Promise<void> {
        const sequelize = this.departmentModel.sequelize!;

        try {
            await sequelize.query(
                `UPDATE employee_details SET department_id = NULL WHERE department_id = :departmentId`,
                { replacements: { departmentId: id }, type: 'UPDATE' as any },
            );
        } catch (e) {
            console.error('Failed to clear department from employee_details:', e);
        }

        try {
            await sequelize.query(
                `UPDATE student_registration_requests SET department_id = NULL WHERE department_id = :departmentId`,
                { replacements: { departmentId: id }, type: 'UPDATE' as any },
            );
        } catch (e) {
            console.error('Failed to clear department from student_registration_requests:', e);
        }
    }

    async deleteDepartment(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const department = await this.departmentModel.findOne({ where: { id, is_active: true } });
            if (!department) {
                throw new HttpException('Department not found', 404);
            }

            await this.ensureDepartmentCanBeRemoved(id, 'deactivate');

            await department.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'Department',
                    entity_id: `DEP-${id}`,
                    metadata: `Deactivated department "${department.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Department deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteDepartment(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const department = await this.departmentModel.findByPk(id);
            if (!department) {
                throw new HttpException('Department not found', 404);
            }

            await this.ensureDepartmentCanBeRemoved(id, 'delete');
            await this.cleanupDepartmentReferencesBeforeDelete(id);

            await department.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'Department',
                    entity_id: `DEP-${id}`,
                    metadata: `Permanently deleted department "${department.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Department permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
