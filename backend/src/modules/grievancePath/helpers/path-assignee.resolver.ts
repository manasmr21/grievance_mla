import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeeDetails } from '../../employeeDetails/models/employeeDetails.model';
import { Role } from '../../roles/models/roles.model';
import { UserAccount } from '../../userAccount/models/user.model';
import { GrievancePathNodeRole } from '../models/grievancePathNodeRole.model';
import { buildEmployeeRoleWhere } from '../../../utils/employee-role.utils';
import { MAX_NODE_ROLES } from './grievance-path.helpers';

type RequestUserLike = {
    email?: string | null;
    name?: string | null;
    role_id?: number | null;
};

@Injectable()
export class PathAssigneeResolver {
    constructor(
        @InjectModel(Role)
        private readonly roleModel: typeof Role,
        @InjectModel(EmployeeDetails)
        private readonly employeeModel: typeof EmployeeDetails,
        @InjectModel(GrievancePathNodeRole)
        private readonly nodeRoleModel: typeof GrievancePathNodeRole,
        @InjectModel(UserAccount)
        private readonly userAccountModel: typeof UserAccount,
    ) {}

    /** Links portal user accounts (e.g. admin) to employee_details for path assignment. */
    async ensureEmployeeForUser(reqUser: RequestUserLike): Promise<EmployeeDetails | null> {
        const email = reqUser?.email?.trim();
        if (!email) return null;

        const existing = await this.employeeModel.findOne({ where: { email } });
        if (existing) {
            if (!existing.is_active) {
                await existing.update({ is_active: true });
            }
            return existing;
        }

        const roleId = Number(reqUser.role_id);
        if (!Number.isInteger(roleId) || roleId <= 0) return null;

        return this.employeeModel.create({
            name: reqUser.name?.trim() || email,
            email,
            role_id: roleId,
            is_active: true,
        });
    }

    async resolveEmployeesForRole(roleId: number): Promise<EmployeeDetails[]> {
        const role = await this.roleModel.findOne({ where: { id: roleId, is_active: true } });
        if (!role) return [];

        const fromEmployees = await this.employeeModel.findAll({
            where: buildEmployeeRoleWhere(roleId) as any,
            order: [['name', 'ASC']],
        });

        const byId = new Map(fromEmployees.map((employee) => [employee.id, employee]));
        const seenEmails = new Set(
            fromEmployees
                .map((employee) => employee.email?.trim().toLowerCase())
                .filter(Boolean) as string[],
        );

        const accounts = await this.userAccountModel.findAll({
            where: { role_id: roleId, account_status: 'active' },
            order: [['name', 'ASC']],
        });

        for (const account of accounts) {
            const email = account.email?.trim();
            if (!email) continue;
            const emailKey = email.toLowerCase();
            if (seenEmails.has(emailKey)) continue;

            let employee = await this.employeeModel.findOne({ where: { email } });
            if (!employee) {
                employee = await this.employeeModel.create({
                    name: account.name?.trim() || email,
                    email,
                    role_id: roleId,
                    is_active: true,
                });
            } else if (!employee.is_active) {
                await employee.update({ is_active: true });
            }

            if (!byId.has(employee.id)) {
                byId.set(employee.id, employee);
                seenEmails.add(emailKey);
            }
        }

        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    async resolveAssigneesForNode(nodeId: number): Promise<string[]> {
        const nodeRoles = await this.nodeRoleModel.findAll({
            where: { node_id: nodeId },
            order: [['sort_order', 'ASC']],
        });

        const assigneeIds: string[] = [];
        for (const nr of nodeRoles) {
            const employees = await this.resolveEmployeesForRole(nr.role_id);
            if (employees.length > 0) {
                const id = employees[0].id;
                if (!assigneeIds.includes(id)) assigneeIds.push(id);
            }
            if (assigneeIds.length >= MAX_NODE_ROLES) break;
        }
        return assigneeIds;
    }

    async resolveAssigneesFromRoleIds(roleIds: number[]): Promise<string[]> {
        const assigneeIds: string[] = [];
        for (const roleId of roleIds) {
            const employees = await this.resolveEmployeesForRole(roleId);
            if (employees.length > 0) {
                const id = employees[0].id;
                if (!assigneeIds.includes(id)) assigneeIds.push(id);
            }
            if (assigneeIds.length >= MAX_NODE_ROLES) break;
        }
        return assigneeIds;
    }
}
