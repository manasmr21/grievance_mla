import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './auditLog.service';

@Controller('audit-logs')
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }

    @Get()
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('action') action?: string,
        @Query('entityType') entityType?: string,
        @Query('dateRange') dateRange?: string,
        @Query('admin') admin?: string,
        @Query('filterDate') filterDate?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
        @Query('sortField') sortField?: string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        
        const filters = {
            action,
            entityType,
            dateRange,
            admin,
            filterDate,
            startTime,
            endTime,
        };

        return this.auditLogService.findAll(filters, pageNumber, limitNumber, sortField, sortOrder);
    }
}
