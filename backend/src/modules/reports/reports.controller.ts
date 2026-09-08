import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';
import { verifyAdmin } from '../../auth/verifyRoles';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('admin')
    @ApiOperation({ summary: 'Download admin summary report (Excel or PDF)' })
    @ApiQuery({ name: 'format', enum: ['excel', 'pdf', 'json'], required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'department', required: false, description: 'Department id or All' })
    @ApiQuery({ name: 'viewBy', required: false, enum: ['all', 'department'], description: 'Report mode' })
    @ApiQuery({ name: 'category', required: false, description: 'Category id or All' })
    @ApiQuery({ name: 'subCategory', required: false, description: 'Sub-category id or All' })
    async adminReport(
        @Query() query: any,
        @Req() req: any,
        @Res() res: any,
    ) {
        await verifyAdmin(req.user);

        const format = query.format || 'json';

        if (format === 'excel') {
            const buffer = await this.reportsService.generateAdminExcel(query);
            const filename = `grievance-report-${this.dateSuffix()}.xlsx`;
            res.set({
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });
            return res.end(buffer);
        }

        if (format === 'pdf') {
            const buffer = await this.reportsService.generateAdminPdf(query);
            const filename = `grievance-report-${this.dateSuffix()}.pdf`;
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });
            return res.end(buffer);
        }

        // JSON — preview stats
        const data = await this.reportsService.getAdminReportData(query);
        return res.json({
            success: true,
            data: {
                viewBy: data.viewBy,
                total: data.total,
                statusCounts: data.statusCounts,
                priorityCounts: data.priorityCounts,
                statusNames: data.statusNames,
                departments: data.departments,
                categories: data.categories,
                subCategories: data.subCategories,
                categoryBreakdown: data.categoryBreakdown,
                departmentRows: data.departmentRows,
                departmentDetail: data.departmentDetail,
                dateRange: data.dateRange,
                filters: data.filters,
            },
        });
    }

    private dateSuffix(): string {
        return new Date().toISOString().slice(0, 10);
    }
}
