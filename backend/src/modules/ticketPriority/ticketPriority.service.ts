import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { TicketPriority } from "./models/ticketPriority.model";
import { TicketPriorityDto } from "./dto/ticketPriority.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Role } from "../roles/models/roles.model";
import { verifyAdmin } from "../../auth/verifyRoles";
import { Op } from "sequelize";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { buildSearchWhere } from "src/utils/search.utils";

@Injectable()
export class TicketPriorityService {
    constructor(
        @InjectModel(TicketPriority)
        private ticketPriorityModel: typeof TicketPriority,
        private auditLogService: AuditLogService,
    ) { }

    async createTicketPriority(data: TicketPriorityDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code } = data;

            if (!name || !code) {
                throw new HttpException('Name and code are required', 400);
            }

            const existingPriority = await this.ticketPriorityModel.findOne({
                where: { code }
            });

            if (existingPriority) {
                throw new HttpException('Priority with this code already exists', 400);
            }

            const priority = await this.ticketPriorityModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'CREATE',
                    entity_type: 'TicketPriority',
                    entity_id: `PRIO-${priority.id}`,
                    metadata: `Created ticket priority "${priority.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Priority created successfully',
                data: priority,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllTicketPriorities(page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            return await paginate(
                this.ticketPriorityModel,
                { 
                    where: { is_active: true, ...searchWhere },
                    order: [['resolution_hours', 'ASC']]
                },
                page,
                limit
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getTicketPriorityById(id: number): Promise<any> {
        try {
            const priority = await this.ticketPriorityModel.findOne({
                where: { id, is_active: true }
            });
            if (!priority) {
                throw new HttpException('Ticket Priority not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Ticket Priority fetched successfully',
                data: priority,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateTicketPriority(id: number, data: Partial<TicketPriorityDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.code) {
                const existingPriority = await this.ticketPriorityModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingPriority) {
                    throw new HttpException('Priority with this code already exists', 400);
                }
            }

            const [affectedCount, priorities] = await this.ticketPriorityModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Ticket Priority not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'TicketPriority',
                    entity_id: `PRIO-${id}`,
                    metadata: `Updated ticket priority details for ID ${id}`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Priority updated successfully',
                data: priorities[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteTicketPriority(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const priority = await this.ticketPriorityModel.findOne({ where: { id, is_active: true } });
            if (!priority) {
                throw new HttpException('Ticket Priority not found', 404);
            }
            await priority.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'TicketPriority',
                    entity_id: `PRIO-${id}`,
                    metadata: `Deactivated ticket priority "${priority.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Priority deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteTicketPriority(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const priority = await this.ticketPriorityModel.findByPk(id);
            if (!priority) {
                throw new HttpException('Ticket Priority not found', 404);
            }
            await priority.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'TicketPriority',
                    entity_id: `PRIO-${id}`,
                    metadata: `Permanently deleted ticket priority "${priority.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Priority permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
