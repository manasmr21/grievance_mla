import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLog } from './models/auditLog.model';
import { UserAccount } from '../userAccount/models/user.model';
import { Op } from 'sequelize';

@Injectable()
export class AuditLogService {
    constructor(
        @InjectModel(AuditLog)
        private auditLogModel: typeof AuditLog,
        @InjectModel(UserAccount)
        private userAccountModel: typeof UserAccount,
    ) { }

    async create(createAuditLogDto: any): Promise<AuditLog> {
        return this.auditLogModel.create(createAuditLogDto);
    }

    async findAll(filters: any, page: number = 1, limit: number = 10, sortField?: string, sortOrder?: string) {
        const offset = (page - 1) * limit;
        const whereClause: any = {};
        // Apply filters
        if (filters.action && filters.action !== 'All Actions') {
            whereClause.action = filters.action;
        }

        if (filters.entityType && filters.entityType !== 'All Entities') {
            whereClause.entity_type = filters.entityType;
        }

        if (filters.dateRange && filters.dateRange !== 'All Dates') {
            const now = new Date();
            const fromDate = new Date();

            if (filters.dateRange === 'Today') {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                whereClause.createdAt = { [Op.gte]: startOfToday };
            } else if (filters.dateRange === 'Yesterday') {
                const startOfYesterday = new Date();
                startOfYesterday.setDate(now.getDate() - 1);
                startOfYesterday.setHours(0, 0, 0, 0);

                const endOfYesterday = new Date();
                endOfYesterday.setDate(now.getDate() - 1);
                endOfYesterday.setHours(23, 59, 59, 999);

                whereClause.createdAt = { [Op.between]: [startOfYesterday, endOfYesterday] };
            } else if (filters.dateRange === 'Last 7 Days') {
                fromDate.setDate(now.getDate() - 7);
                whereClause.createdAt = { [Op.gte]: fromDate };
            } else if (filters.dateRange === 'Last 30 Days') {
                fromDate.setDate(now.getDate() - 30);
                whereClause.createdAt = { [Op.gte]: fromDate };
            } else if (filters.dateRange === 'Specific Date' && filters.filterDate) {
                const start = new Date(`${filters.filterDate}T00:00:00.000`);
                const end = new Date(`${filters.filterDate}T23:59:59.999`);
                whereClause.createdAt = { [Op.between]: [start, end] };
            } else if (filters.dateRange === 'Specific Time Range' && filters.filterDate) {
                const startHourMin = filters.startTime || '00:00';
                const endHourMin = filters.endTime || '23:59';
                const start = new Date(`${filters.filterDate}T${startHourMin}:00.000`);
                const end = new Date(`${filters.filterDate}T${endHourMin}:59.999`);
                whereClause.createdAt = { [Op.between]: [start, end] };
            }
        }

        if (filters.admin && filters.admin !== 'All Admins') {
            const matchingUsers = await this.userAccountModel.findAll({
                where: { name: filters.admin },
                attributes: ['id']
            });
            const matchingUserIds = matchingUsers.map(u => u.id);
            whereClause.actor_id = { [Op.in]: matchingUserIds };
        }

        // Sorting
        const allowedFields = ['id', 'action', 'entity_type', 'entity_id', 'createdAt'];
        const field = (sortField && allowedFields.includes(sortField)) ? sortField : 'createdAt';
        const direction = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const { rows, count } = await this.auditLogModel.findAndCountAll({
            where: whereClause,
            order: [[field, direction]],
            limit,
            offset,
        });

        // Fetch corresponding users from UserAccount table
        const actorIds = [...new Set(rows.map(row => row.actor_id))];
        const users = await this.userAccountModel.findAll({
            where: { id: { [Op.in]: actorIds } },
            attributes: ['id', 'name', 'email']
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        const populatedRows = rows.map(row => {
            const rowJson = row.get({ plain: true }) as any;
            rowJson.actor = userMap.get(row.actor_id) || null;
            return rowJson;
        });

        return {
            data: populatedRows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    }
}
