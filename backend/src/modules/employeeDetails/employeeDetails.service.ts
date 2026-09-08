import { ConflictException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { EmployeeDetails } from "./models/employeeDetails.model";
import { EmployeeDetailsDto } from "./dto/employeeDetails.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Department } from "../department/models/department.model";
import { Role } from "../roles/models/roles.model";
import { UserAccount } from "../userAccount/models/user.model";
import { MailService } from "../../utils/mail/sendMails";
import { Op, where } from "sequelize";
import bcrypt from "bcrypt";
import { verifyAdmin } from "../../auth/verifyRoles";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { ROLE_CODES } from "../../common/constants/priority.constants";
import { checkRecordReferences } from "../../utils/db.utils";
import { attachPrimaryRole, buildEmployeeAnyRoleWhere } from "../../utils/employee-role.utils";
import { TableSchemaService } from "../tableSchema/table-schema.service";
import { DEPARTMENT_TABLE_CODE, FIELD_KIND_ROLE_REF } from "../tableSchema/table-schema.constants";

@Injectable()
export class EmployeeDetailsService {
    constructor(
        @InjectModel(EmployeeDetails)
        private employeeDetailsModel: typeof EmployeeDetails,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(Role)
        private roleModel: typeof Role,
        @InjectModel(UserAccount)
        private userAccountModel: typeof UserAccount,
        private mailService: MailService,
        private auditLogService: AuditLogService,
        private readonly tableSchemaService: TableSchemaService,
    ) { }

    private async getDepartmentRoleIds(departmentId: number): Promise<number[]> {
        const columns = (await this.tableSchemaService.getActiveCustomColumns(DEPARTMENT_TABLE_CODE))
            .filter((col) => col.field_kind === FIELD_KIND_ROLE_REF);
        if (!columns.length) return [];

        const customFieldMap = await this.tableSchemaService.readCustomFieldsForDepartments([departmentId], columns);
        const fields = customFieldMap.get(departmentId) || {};
        const roleIds = new Set<number>();

        for (const col of columns) {
            const raw = fields[col.code]?.value ?? fields[col.code];
            const roleId = Number(typeof raw === 'object' && raw !== null ? (raw as any).value : raw);
            if (Number.isInteger(roleId) && roleId > 0) {
                roleIds.add(roleId);
            }
        }

        return Array.from(roleIds);
    }

    private filterAssignableEmployees<T extends { role?: { code?: string | null; name?: string | null } }>(
        employees: T[],
    ): T[] {
        const blockedRoles = new Set(['STUDENT', ROLE_CODES.ADMIN]);
        return employees.filter((emp) => {
            const code = emp.role?.code?.toUpperCase() || '';
            const name = emp.role?.name?.toUpperCase() || '';
            return !blockedRoles.has(code) && !name.includes('ADMIN') && !name.includes('STUDENT');
        });
    }

    async createEmployeeDetails(data: EmployeeDetailsDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, email, password, mobile_number, role_id } = data;

            if (!role_id) {
                throw new HttpException('Role is required', 400);
            }

            if (!name || !email || !password) {
                throw new HttpException('Please enter all required fields. Name, role, email, password', 400);
            }

            if (mobile_number && !/^\d{10}$/.test(mobile_number.trim())) {
                throw new HttpException('Mobile number must be exactly 10 digits', 400);
            }

            const roleExists = await this.roleModel.findByPk(role_id);
            if (!roleExists) {
                throw new HttpException('Role not found', 404);
            }

            const roleCodeUpper = roleExists.code?.toUpperCase() || '';
            if (roleCodeUpper === ROLE_CODES.ADMIN || roleCodeUpper === 'STUDENT') {
                throw new HttpException('Admin and Student roles cannot be assigned to employees.', 400);
            }

            const userExist = await this.userAccountModel.findOne({ where: { email } });

            if (userExist) {
                throw new ConflictException({
                    success: false,
                    message: "User with this email already exists."
                })
            }

            const employee = await this.employeeDetailsModel.create({
                ...data,
                role_id,
            });

            let userAccount: UserAccount | null = null;
            if (email && password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                const roleCode = roleExists.code ? roleExists.code.toUpperCase() : '';
                const roleName = roleExists.name ? roleExists.name.toUpperCase() : '';

                let dashboard_route = '/staff/dashboard';
                if (roleCode === ROLE_CODES.ADMIN || roleName.includes('ADMIN')) {
                    dashboard_route = '/admin/dashboard';
                }

                userAccount = await this.userAccountModel.create({
                    email,
                    name: name,
                    password: hashedPassword,
                    role_id,
                    account_status: "active",
                    dashboard_route
                });

                // Send credentials email to the user
                try {
                    const subject = 'Your Account Credentials - Grievance Management System';
                    const message = `
                        <p>Hello <strong>${name}</strong>,</p>
                        <p>Your account has been created successfully in the Grievance Management System.</p>
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
                            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b; font-weight: 500; font-size: 14px; width: 80px;">Email:</td>
                                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace;">${email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b; font-weight: 500; font-size: 14px;">Password:</td>
                                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace;">${password}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${process.env.FRONTEND_URL}/login" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Log In to Portal</a>
                        </div>
                        <p>Please log in and secure your credentials by changing your password at the earliest.</p>
                    `;
                    await this.mailService.sendMailService(email, subject, message);
                } catch (mailError) {
                    console.error('Failed to send credentials email:', mailError);
                }
            }

            const response = {
                success: true,
                message: userAccount
                    ? 'Employee details and user account created successfully'
                    : 'Employee details created successfully',
                data: employee,
                userAccount: userAccount ? {
                    id: userAccount.id,
                    email: userAccount.email,
                    name: userAccount.name,
                    role_id: userAccount.role_id,
                    account_status: userAccount.account_status
                } : undefined
            };

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'CREATE',
                    entity_type: 'EmployeeDetails',
                    entity_id: `EMP-${employee.id}`,
                    metadata: `Created employee details for "${employee.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return response;
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllEmployeeDetails(
        page?: number | string,
        limit?: number | string,
        role_id?: string,
        department_id?: string,
        assignable_only?: string,
    ): Promise<any> {
        try {
            let where: Record<string, unknown> = { is_active: true };

            if (department_id) {
                const deptId = Number(department_id);
                if (!Number.isInteger(deptId) || deptId <= 0) {
                    throw new HttpException('Invalid department_id', 400);
                }

                const department = await this.departmentModel.findOne({
                    where: { id: deptId, is_active: true },
                });
                if (!department) {
                    throw new HttpException('Department not found or inactive', 404);
                }

                const deptRoleIds = await this.getDepartmentRoleIds(deptId);
                if (!deptRoleIds.length) {
                    return {
                        success: true,
                        data: [],
                        total: 0,
                        totalPages: 0,
                        page: page ? Math.max(1, parseInt(String(page), 10)) : 1,
                        message: 'No roles configured for this department',
                    };
                }

                where = buildEmployeeAnyRoleWhere(deptRoleIds);
            } else if (role_id) {
                where.role_id = Number(role_id);
            }

            const result = await paginate(
                this.employeeDetailsModel,
                {
                    where,
                    include: [Department],
                    order: [['name', 'ASC']],
                },
                page,
                limit
            );
            if (result?.data?.length) {
                result.data = await attachPrimaryRole(
                    result.data.map((employee: any) => employee.get ? employee.get({ plain: true }) : employee),
                    this.roleModel,
                ) as any;
            }

            if (assignable_only === 'true' || assignable_only === '1') {
                const filtered = this.filterAssignableEmployees((result.data || []) as any[]);
                result.data = filtered as typeof result.data;
                result.total = filtered.length;
            }

            return result;
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getEmployeeDetailsById(id: string): Promise<any> {
        try {
            const employee = await this.employeeDetailsModel.findOne({
                where: { id, is_active: true },
                include: [Department],
            });
            if (!employee) {
                throw new HttpException('Employee details not found or inactive', 404);
            }
            const [enrichedEmployee] = await attachPrimaryRole([employee.get({ plain: true })], this.roleModel);
            return {
                success: true,
                message: 'Employee details fetched successfully',
                data: enrichedEmployee,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateEmployeeDetails(id: string, data: Partial<EmployeeDetailsDto>, reqUser: any): Promise<any> {
        let transaction: any;
        try {
            await verifyAdmin(reqUser);
            if (data.mobile_number && !/^\d{10}$/.test(data.mobile_number.trim())) {
                throw new HttpException('Mobile number must be exactly 10 digits', 400);
            }

            const incomingRoleId =
                data.role_id != null && data.role_id !== undefined
                    ? Number(data.role_id)
                    : undefined;

            const [employee, departmentExists] = await Promise.all([
                this.employeeDetailsModel.findByPk(id),
                data.department_id ? this.departmentModel.findByPk(data.department_id) : Promise.resolve(null),
            ]);

            if (!employee) {
                throw new NotFoundException({
                    success: false,
                    message: "Employee details not found"
                });
            }

            let employeeRole = await this.roleModel.findByPk(incomingRoleId ?? employee.role_id);

            if (incomingRoleId != null) {
                employeeRole = await this.roleModel.findByPk(incomingRoleId);
                if (!employeeRole) {
                    throw new NotFoundException({ success: false, message: "Role not found" });
                }
                const roleCodeUpper = employeeRole.code?.toUpperCase() || '';
                if (roleCodeUpper === ROLE_CODES.ADMIN || roleCodeUpper === 'STUDENT') {
                    throw new HttpException('Admin and Student roles cannot be assigned to employees.', 400);
                }
                (data as any).role_id = incomingRoleId;
            }

            const roleCode = employeeRole?.code?.toUpperCase() || '';



            if (data.department_id && !departmentExists) {
                throw new HttpException('Department not found', 404);
            }

            const oldEmail = employee.email;
            const newEmail = data.email;

            if (newEmail && newEmail !== oldEmail) {
                let associatedUser = await this.userAccountModel.findOne({
                    where: { email: oldEmail }
                });
                if (!associatedUser) {
                    associatedUser = await this.userAccountModel.findOne({
                        where: { email: newEmail }
                    });
                }

                const userExist = await this.userAccountModel.findOne({
                    where: {
                        email: newEmail,
                        ...(associatedUser ? { id: { [Op.ne]: associatedUser.id } } : {})
                    }
                });

                if (userExist) {
                    throw new ConflictException({
                        success: false,
                        message: "User with this email already exists."
                    });
                }
            }

            transaction = await this.employeeDetailsModel.sequelize!.transaction();

            const [affectedCount, employees] = await this.employeeDetailsModel.update(data, {
                where: { id },
                returning: true,
                transaction,
            });

            if (affectedCount === 0) {
                throw new HttpException('Employee details not found', 404);
            }

            const updatedEmployee = employees[0];

            if (newEmail && newEmail !== oldEmail) {
                const linkedUser = await this.userAccountModel.findOne({
                    where: { email: oldEmail },
                    transaction,
                });
                if (linkedUser) {
                    await linkedUser.update({ email: newEmail }, { transaction });
                }
            }

            if (incomingRoleId != null) {
                const linkedUser = await this.userAccountModel.findOne({
                    where: { email: updatedEmployee.email },
                    transaction,
                });
                if (linkedUser) {
                    const roleName = employeeRole?.name?.toUpperCase() || '';
                    let dashboard_route = '/staff/dashboard';
                    if (roleCode === ROLE_CODES.ADMIN || roleName.includes('ADMIN')) {
                        dashboard_route = '/admin/dashboard';
                    }
                    await linkedUser.update({
                        role_id: incomingRoleId,
                        dashboard_route,
                    }, { transaction });
                }
            }

            await transaction.commit();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'EmployeeDetails',
                    entity_id: `EMP-${id}`,
                    metadata: `Updated employee details for "${updatedEmployee.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Employee details updated successfully',
                data: updatedEmployee,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteEmployeeDetails(id: string, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const employee = await this.employeeDetailsModel.findOne({ where: { id, is_active: true } });
            if (!employee) {
                throw new HttpException('Employee details not found', 404);
            }

            const autoHandledTables = [
                'grievance_execution',
                'grievance_details',
                'notifications',
                'grievance_chats',
                'grievance_messages',
            ];

            const referenceReasons = new Set<string>();
            const empRefs = await checkRecordReferences(this.employeeDetailsModel.sequelize!, 'employee_details', employee.id);
            for (const ref of empRefs.filter(r => !autoHandledTables.includes(r.table))) {
                referenceReasons.add(ref.table);
            }

            const user = await this.userAccountModel.findOne({ where: { email: employee.email } });
            if (user) {
                const userRefs = await checkRecordReferences(this.employeeDetailsModel.sequelize!, 'user_account', user.id);
                for (const ref of userRefs.filter(r => !autoHandledTables.includes(r.table))) {
                    referenceReasons.add(ref.table);
                }
            }

            if (referenceReasons.size > 0) {
                throw new HttpException(
                    `Cannot deactivate this employee. They are still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign or close those records first.`,
                    400
                );
            }

            await employee.update({ is_active: false });

            // Deactivate associated user account
            if (user) {
                await user.update({ account_status: 'inactive' });
            }

            // Remove this employee from all grievance assignment arrays
            try {
                await this.employeeDetailsModel.sequelize!.query(
                    `UPDATE grievance_details
                     SET current_assigned_employee_id = (
                         SELECT jsonb_agg(elem)
                         FROM jsonb_array_elements(current_assigned_employee_id) AS elem
                         WHERE elem::text != :employeeId
                     )
                     WHERE current_assigned_employee_id @> jsonb_build_array(:employeeId::jsonb)`,
                    {
                        replacements: { employeeId: JSON.stringify(employee.id) },
                        type: 'UPDATE' as any,
                    }
                );
            } catch (removeErr) {
                console.error('Failed to remove deactivated employee from grievance assignments:', removeErr);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'EmployeeDetails',
                    entity_id: `EMP-${id}`,
                    metadata: `Deactivated employee details for "${employee.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Employee details deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteEmployeeDetails(id: string, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const employee = await this.employeeDetailsModel.findByPk(id);
            if (!employee) {
                throw new HttpException('Employee details not found', 404);
            }

            const autoHandledTables = [
                'grievance_execution',
                'grievance_details',
                'notifications',
                'grievance_chats',
                'grievance_messages',
            ];

            const referenceReasons = new Set<string>();
            const empRefs = await checkRecordReferences(this.employeeDetailsModel.sequelize!, 'employee_details', employee.id);
            for (const ref of empRefs.filter(r => !autoHandledTables.includes(r.table))) {
                referenceReasons.add(ref.table);
            }

            const user = await this.userAccountModel.findOne({ where: { email: employee.email } });
            if (user) {
                const userRefs = await checkRecordReferences(this.employeeDetailsModel.sequelize!, 'user_account', user.id);
                for (const ref of userRefs.filter(r => !autoHandledTables.includes(r.table))) {
                    referenceReasons.add(ref.table);
                }
            }

            if (referenceReasons.size > 0) {
                throw new HttpException(
                    `Cannot delete this employee. They are still associated with: ${Array.from(referenceReasons).join(', ')}. Please reassign or close those records first.`,
                    400
                );
            }

            const sequelize = this.employeeDetailsModel.sequelize!;

            // Clean up corresponding user account and its related tables
            if (user) {
                // Delete user account's notifications, chats, messages
                try {
                    await sequelize.query(
                        `DELETE FROM grievance_messages WHERE sender_id = :userId`,
                        { replacements: { userId: user.id }, type: 'DELETE' as any }
                    );
                } catch (e) { console.error('Failed to delete grievance_messages for user:', e); }

                try {
                    await sequelize.query(
                        `DELETE FROM grievance_chats WHERE user1_id = :userId`,
                        { replacements: { userId: user.id }, type: 'DELETE' as any }
                    );
                } catch (e) { console.error('Failed to delete grievance_chats for user:', e); }

                try {
                    await sequelize.query(
                        `DELETE FROM notifications WHERE user_id = :userId`,
                        { replacements: { userId: user.id }, type: 'DELETE' as any }
                    );
                } catch (e) { console.error('Failed to delete notifications for user:', e); }

                await user.destroy();
            }

            // Clean up employee's references
            try {
                await sequelize.query(
                    `UPDATE grievance_details
                     SET current_assigned_employee_id = (
                         SELECT jsonb_agg(elem)
                         FROM jsonb_array_elements(current_assigned_employee_id) AS elem
                         WHERE elem::text != :employeeId
                     )
                     WHERE current_assigned_employee_id @> jsonb_build_array(:employeeId::jsonb)`,
                    {
                        replacements: { employeeId: JSON.stringify(employee.id) },
                        type: 'UPDATE' as any,
                    }
                );
            } catch (e) { console.error('Failed to remove employee from grievance assignments:', e); }

            try {
                await sequelize.query(
                    `DELETE FROM grievance_execution WHERE to_id = :employeeId`,
                    { replacements: { employeeId: employee.id }, type: 'DELETE' as any }
                );
            } catch (e) { console.error('Failed to delete grievance_execution for employee:', e); }

            await employee.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'EmployeeDetails',
                    entity_id: `EMP-${id}`,
                    metadata: `Permanently deleted employee details for "${employee.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Employee details permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
