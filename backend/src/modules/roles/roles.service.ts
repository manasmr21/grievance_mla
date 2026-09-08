import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "./models/roles.model";
import { RoleDto } from "./dto/roles.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Op } from "sequelize";
import { verifyAdmin } from "../../auth/verifyRoles";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { checkRecordReferences } from "src/utils/db.utils";
import { buildSearchWhere } from "src/utils/search.utils";

@Injectable()
export class RolesService {
    constructor(
        @InjectModel(Role)
        private roleModel: typeof Role,
        private auditLogService: AuditLogService,
    ) { }

    async createRole(data: RoleDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code } = data;

            if (!name || !code) {
                throw new HttpException('Role name and code are required', 400);
            }

            const existingRole = await this.roleModel.findOne({
                where: { code }
            });

            if (existingRole) {
                throw new HttpException('Role with this code already exists', 400);
            }

             const role = await this.roleModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'CREATE',
                    entity_type: 'Role',
                    entity_id: `ROLE-${role.id}`,
                    metadata: `Created role "${role.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Role created successfully',
                data: role,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllRolesForMenu(page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            return await paginate(
                this.roleModel,
                {
                    where: searchWhere,
                    order: [['name', 'ASC']],
                },
                page,
                limit,
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllRoles(page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            return await paginate(
                this.roleModel,
                {
                    where: searchWhere,
                    order: [['name', 'ASC']],
                },
                page,
                limit,
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getRoleById(id: number): Promise<any> {
        try {
            const role = await this.roleModel.findOne({
                where: { id, is_active: true }
            });
            if (!role) {
                throw new HttpException('Role not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Role fetched successfully',
                data: role,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateRole(id: number, data: Partial<RoleDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.code) {
                const existingRole = await this.roleModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingRole) {
                    throw new HttpException('Role with this code already exists', 400);
                }
            }

            const [affectedCount, roles] = await this.roleModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Role not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'Role',
                    entity_id: `ROLE-${id}`,
                    metadata: `Updated role details for ID ${id}`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Role updated successfully',
                data: roles[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteRole(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const role = await this.roleModel.findOne({ where: { id, is_active: true } });
            if (!role) {
                throw new HttpException('Role not found', 404);
            }

            const result = await checkRecordReferences(this.roleModel.sequelize!, 'roles', id);

            if (result.length > 0) {
                throw new HttpException(`Role is referenced by ${result.map(item => item.table).join(', ')}`, 400);
            }

            await role.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'Role',
                    entity_id: `ROLE-${id}`,
                    metadata: `Deactivated role "${role.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Role deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteRole(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const role = await this.roleModel.findByPk(id);
            if (!role) {
                throw new HttpException('Role not found', 404);
            }

            const result = await checkRecordReferences(this.roleModel.sequelize!, 'roles', id);

            if (result.length > 0) {
                throw new HttpException(`Role is referenced by ${result.map(item => item.table).join(', ')}`, 400);
            }

            await role.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'Role',
                    entity_id: `ROLE-${id}`,
                    metadata: `Permanently deleted role "${role.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Role permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}