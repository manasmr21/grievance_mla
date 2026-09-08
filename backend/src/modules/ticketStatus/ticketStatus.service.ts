import { HttpException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { TicketStatus } from "./models/ticketStatus.model";
import { TicketStatusDto } from "./dto/ticketStatus.dto";
import { handleServiceError } from "src/utils/Error/errorHandler";
import { Role } from "../roles/models/roles.model";
import { verifyAdmin } from "../../auth/verifyRoles";
import { Op } from "sequelize";
import { AuditLogService } from "../auditLog/auditLog.service";
import { paginate } from "../../utils/pagination";
import { buildSearchWhere } from "src/utils/search.utils";

@Injectable()
export class TicketStatusService {
    constructor(
        @InjectModel(TicketStatus)
        private ticketStatusModel: typeof TicketStatus,
        private auditLogService: AuditLogService,
    ) { }

    async createTicketStatus(data: TicketStatusDto, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const { name, code } = data;

            if (!name || !code) {
                throw new HttpException('Name and code are required', 400);
            }

            const existingStatus = await this.ticketStatusModel.findOne({
                where: { code }
            });

            if (existingStatus) {
                throw new HttpException('Status with this code already exists', 400);
            }

            const status = await this.ticketStatusModel.create(data);

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'CREATE',
                    entity_type: 'TicketStatus',
                    entity_id: `STAT-${status.id}`,
                    metadata: `Created ticket status "${status.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Status created successfully',
                data: status,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getAllTicketStatuses(page?: number | string, limit?: number | string, search?: string): Promise<any> {
        try {
            const searchWhere = buildSearchWhere(search, ['name', 'code']);
            return await paginate(
                this.ticketStatusModel,
                { 
                    where: { is_active: true, ...searchWhere },
                    order: [['name', 'ASC']]
                },
                page,
                limit
            );
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async getTicketStatusById(id: number): Promise<any> {
        try {
            const status = await this.ticketStatusModel.findOne({
                where: { id, is_active: true }
            });
            if (!status) {
                throw new HttpException('Ticket Status not found or inactive', 404);
            }
            return {
                success: true,
                message: 'Ticket Status fetched successfully',
                data: status,
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async updateTicketStatus(id: number, data: Partial<TicketStatusDto>, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            if (data.code) {
                const existingStatus = await this.ticketStatusModel.findOne({
                    where: {
                        code: data.code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingStatus) {
                    throw new HttpException('Status with this code already exists', 400);
                }
            }

            const [affectedCount, statuses] = await this.ticketStatusModel.update(data, {
                where: { id },
                returning: true,
            });

            if (affectedCount === 0) {
                throw new HttpException('Ticket Status not found', 404);
            }

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'UPDATE',
                    entity_type: 'TicketStatus',
                    entity_id: `STAT-${id}`,
                    metadata: `Updated ticket status details for ID ${id}`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Status updated successfully',
                data: statuses[0],
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async deleteTicketStatus(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const status = await this.ticketStatusModel.findOne({ where: { id, is_active: true } });
            if (!status) {
                throw new HttpException('Ticket Status not found', 404);
            }

            if(status.code === 'ACTIVE'){
                throw new HttpException('Cannot deactivate this ticket status', 400);
            }

            await status.update({ is_active: false });

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'TicketStatus',
                    entity_id: `STAT-${id}`,
                    metadata: `Deactivated ticket status "${status.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Status deactivated successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    async permanentDeleteTicketStatus(id: number, reqUser: any): Promise<any> {
        try {
            await verifyAdmin(reqUser);
            const status = await this.ticketStatusModel.findByPk(id);
            if (!status) {
                throw new HttpException('Ticket Status not found', 404);
            }

            if(status.code === 'ACTIVE'){
                throw new HttpException('Cannot delete active ticket status', 400);
            }

            await status.destroy();

            try {
                await this.auditLogService.create({
                    actor_id: reqUser?.id || 1,
                    action: 'DELETE',
                    entity_type: 'TicketStatus',
                    entity_id: `STAT-${id}`,
                    metadata: `Permanently deleted ticket status "${status.name}"`
                });
            } catch (auditError) {
                console.error("Failed to create audit log:", auditError);
            }

            return {
                success: true,
                message: 'Ticket Status permanently deleted successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}
