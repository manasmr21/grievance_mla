import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Grievance } from '../grievances/models/grievance.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { Department } from '../department/models/department.model';
import { TicketStatus } from '../ticketStatus/models/ticketStatus.model';
import { TicketPriority } from '../ticketPriority/models/ticketPriority.model';
import { GrievanceCategory } from '../grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from '../grievanceSubCategory/models/grievanceSubCategory.model';
import { GrievanceType } from '../grievanceType/models/grievanceType.model';
import { Role } from '../roles/models/roles.model';
import { Op, Sequelize } from 'sequelize';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { attachPrimaryRole, employeeHasRoleCode } from '../../utils/employee-role.utils';

export interface ReportQuery {
    format?: 'excel' | 'pdf' | 'json';
    startDate?: string;
    endDate?: string;
    status?: string;
    department?: string;
    /** all | department */
    viewBy?: string;
    category?: string;
    subCategory?: string;
}

interface DepartmentReportRow {
    id: number;
    name: string;
    grievances: { total: number; counts: Record<string, number> };
}

interface BreakdownEntry {
    id: number | null;
    name: string;
    total: number;
    counts: Record<string, number>;
}

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Grievance) private grievanceModel: typeof Grievance,
        @InjectModel(Department) private departmentModel: typeof Department,
        @InjectModel(TicketStatus) private statusModel: typeof TicketStatus,
        @InjectModel(TicketPriority) private priorityModel: typeof TicketPriority,
        @InjectModel(GrievanceCategory) private categoryModel: typeof GrievanceCategory,
        @InjectModel(GrievanceSubCategory) private subCategoryModel: typeof GrievanceSubCategory,
        @InjectModel(Role) private roleModel: typeof Role,
        @InjectModel(EmployeeDetails) private employeeModel: typeof EmployeeDetails,
    ) { }

    private assignedEmployeesInclude() {
        return {
            model: EmployeeDetails,
            as: 'assignedEmployees',
            on: Sequelize.literal(`"Grievance"."current_assigned_employee_id" @> jsonb_build_array("assignedEmployees"."id"::text)`),
            required: false,
            attributes: ['id', 'name', 'role_id'],
        };
    }

    private async enrichGrievancesWithEmployeeRoles(grievances: Grievance[]): Promise<any[]> {
        if (!grievances.length) return [];

        return Promise.all(
            grievances.map(async (grievance) => {
                const plain: any = grievance.get({ plain: true });
                if (Array.isArray(plain.assignedEmployees) && plain.assignedEmployees.length > 0) {
                    plain.assignedEmployees = await attachPrimaryRole(plain.assignedEmployees, this.roleModel);
                }
                return plain;
            }),
        );
    }

    private async resolveDepartmentHodNames(departmentIds: number[]): Promise<Map<number, string>> {
        const map = new Map<number, string>();
        if (!departmentIds.length) return map;

        const [employees, roles] = await Promise.all([
            this.employeeModel.findAll({
                where: { department_id: { [Op.in]: departmentIds }, is_active: true },
                attributes: ['id', 'name', 'department_id', 'role_id'],
            }),
            this.roleModel.findAll({ where: { is_active: true }, attributes: ['id', 'name', 'code'] }),
        ]);

        for (const employee of employees) {
            if (!employee.department_id) continue;
            if (employeeHasRoleCode(employee, 'HOD', roles)) {
                map.set(employee.department_id, employee.name);
            }
        }

        return map;
    }

    // ─── helpers ────────────────────────────────────────────────────────────────

    private buildDateWhere(startDate?: string, endDate?: string): object {
        const dateFilter: any = {};
        if (startDate) dateFilter[Op.gte] = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter[Op.lte] = end;
        }
        return Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
    }

    private fmt(date: Date | null | undefined): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: '2-digit',
        });
    }

    private countGrievancesByStatus(
        grievances: Grievance[],
        statusNames: string[],
    ): { total: number; counts: Record<string, number> } {
        const counts: Record<string, number> = {};
        for (const name of statusNames) counts[name] = 0;
        for (const g of grievances) {
            const sName = (g as any).status?.name;
            if (sName) counts[sName] = (counts[sName] || 0) + 1;
        }
        return { total: grievances.length, counts };
    }

    private buildDepartmentBreakdownList(
        departments: Department[],
        statusNames: string[],
    ): DepartmentReportRow[] {
        return departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            grievances: this.countGrievancesByStatus([], statusNames),
        }));
    }

    private parseDepartmentFilter(department?: string): number | null {
        if (!department || department === 'All') return null;
        const id = Number(department);
        return Number.isFinite(id) && id > 0 ? id : null;
    }

    private parseIdFilter(value?: string): number | null {
        if (!value || value === 'All') return null;
        const id = Number(value);
        return Number.isFinite(id) && id > 0 ? id : null;
    }

    private normalizeViewBy(viewBy?: string): 'all' | 'department' {
        const v = String(viewBy || 'all').toLowerCase();
        if (v === 'department') return 'department';
        return 'all';
    }

    /** Hostel type = HOSTEL. Department/universal responsibility = non-hostel (ACADEMIC / UNIVERSAL). */
    private isHostelTypeCode(code?: string | null): boolean {
        return String(code || '').toUpperCase() === 'HOSTEL';
    }

    private isDepartmentTypeCode(code?: string | null): boolean {
        const c = String(code || '').toUpperCase();
        return c === 'ACADEMIC' || c === 'UNIVERSAL' || (c.length > 0 && c !== 'HOSTEL');
    }

    private getTypeCode(g: Grievance): string {
        return String((g as any).category?.type?.code || '').toUpperCase();
    }

    private isResolvedStatus(g: Grievance): boolean {
        const code = String((g as any).status?.code || '').toUpperCase();
        return code === 'RESOLVED' || code === 'CLOSED';
    }

    private isPendingStatus(g: Grievance): boolean {
        return !this.isResolvedStatus(g);
    }

    private statusCountBucket(g: Grievance): 'underReview' | 'resolved' | 'reopened' | 'other' {
        const code = String((g as any).status?.code || '').toUpperCase();
        if (code === 'UNDER_REVIEW' || code === 'ACTIVE') return 'underReview';
        if (code === 'RESOLVED' || code === 'CLOSED') return 'resolved';
        if (code === 'REOPENED') return 'reopened';
        return 'other';
    }

    private buildAdminGrievanceWhere(
        query: ReportQuery,
        dateWhere: object,
        viewBy: 'all' | 'department',
    ): Record<string, unknown> {
        const where: Record<string, unknown> = { ...dateWhere };
        const departmentId = this.parseDepartmentFilter(query.department);
        const categoryId = this.parseIdFilter(query.category);
        const subCategoryId = this.parseIdFilter(query.subCategory);

        if (categoryId) where.category_id = categoryId;
        if (subCategoryId) where.sub_category_id = subCategoryId;

        return where;
    }

    private filterGrievancesByView(grievances: Grievance[], viewBy: 'all' | 'department'): Grievance[] {
        if (viewBy === 'department') {
            return grievances.filter(g => this.isDepartmentTypeCode(this.getTypeCode(g)));
        }
        return grievances;
    }

    private buildCategoryBreakdown(grievances: Grievance[], categories: GrievanceCategory[]): any[] {
        const byCat = new Map<number, Grievance[]>();
        for (const g of grievances) {
            const id = g.category_id;
            if (!byCat.has(id)) byCat.set(id, []);
            byCat.get(id)!.push(g);
        }

        const rows = categories.map(cat => {
            const list = byCat.get(cat.id) || [];
            const typeCode = String((cat as any).type?.code || '');
            const typeName = String((cat as any).type?.name || typeCode || '-');
            let resolved = 0;
            let pending = 0;
            let underReview = 0;
            let reopened = 0;
            const assigneeIds = new Set<string>();
            const roleNames = new Set<string>();

            for (const g of list) {
                const bucket = this.statusCountBucket(g);
                if (bucket === 'resolved') resolved++;
                else pending++;
                if (bucket === 'underReview') underReview++;
                if (bucket === 'reopened') reopened++;
                const assignees = Array.isArray(g.current_assigned_employee_id)
                    ? g.current_assigned_employee_id
                    : [];
                for (const id of assignees) if (id) assigneeIds.add(String(id));

                const employees = Array.isArray((g as any).assignedEmployees)
                    ? (g as any).assignedEmployees
                    : [];
                for (const emp of employees) {
                    const label = emp.role?.name || emp.role?.code;
                    if (label) roleNames.add(String(label));
                }
            }

            return {
                id: cat.id,
                name: cat.name,
                typeCode,
                typeName,
                responsible: roleNames.size > 0
                    ? [...roleNames].sort((a, b) => a.localeCompare(b)).join(', ')
                    : 'Unassigned',
                assignedCount: assigneeIds.size,
                total: list.length,
                underReview,
                resolved,
                reopened,
                pending,
            };
        });

        return rows.filter(r => r.total > 0).sort((a, b) => b.total - a.total);
    }

    private buildDepartmentReportRows(
        departments: Department[],
    ): any[] {
        return departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            total: 0,
            underReview: 0,
            resolved: 0,
            reopened: 0,
        }));
    }

    // ─── admin data ──────────────────────────────────────────────────────────────

    async getAdminReportData(query: ReportQuery): Promise<any> {
        const viewBy = this.normalizeViewBy(query.viewBy);
        const dateWhere = this.buildDateWhere(query.startDate, query.endDate);
        const grievanceWhere = this.buildAdminGrievanceWhere(query, dateWhere, viewBy);
        const departmentId = this.parseDepartmentFilter(query.department);
        const categoryId = this.parseIdFilter(query.category);

        const [
            rawGrievances,
            statuses,
            priorities,
            departments,
            allCategories,
            subCategories,
        ] = await Promise.all([
            this.grievanceModel.findAll({
                where: grievanceWhere,
                include: [
                    { model: TicketStatus, attributes: ['name', 'code'] },
                    { model: TicketPriority, attributes: ['name', 'code'] },
                    {
                        model: GrievanceCategory,
                        attributes: ['id', 'name', 'code', 'type_id'],
                        include: [{ model: GrievanceType, attributes: ['id', 'name', 'code'] }],
                    },
                    { model: GrievanceSubCategory, attributes: ['id', 'name', 'code', 'category_id'] },
                    this.assignedEmployeesInclude(),
                ],
                order: [['createdAt', 'DESC']],
            }),
            this.statusModel.findAll({ where: { is_active: true } }),
            this.priorityModel.findAll({ where: { is_active: true } }),
            this.departmentModel.findAll({
                where: { is_active: true },
                order: [['name', 'ASC']],
            }),
            this.categoryModel.findAll({
                where: { is_active: true },
                include: [{ model: GrievanceType, attributes: ['id', 'name', 'code'] }],
                order: [['name', 'ASC']],
            }),
            this.subCategoryModel.findAll({
                where: {
                    is_active: true,
                    ...(categoryId ? { category_id: categoryId } : {}),
                },
                attributes: ['id', 'name', 'category_id'],
                order: [['name', 'ASC']],
            }),
        ]);

        const enrichedGrievances = await this.enrichGrievancesWithEmployeeRoles(rawGrievances);
        const allGrievances = this.filterGrievancesByView(enrichedGrievances, viewBy);
        const statusNames = statuses.map(s => s.name);

        const statusCounts: Record<string, number> = {};
        for (const s of statuses) statusCounts[s.name] = 0;
        for (const g of allGrievances) {
            const sName = (g as any).status?.name;
            if (sName) statusCounts[sName] = (statusCounts[sName] || 0) + 1;
        }

        const priorityCounts: Record<string, number> = {};
        for (const p of priorities) priorityCounts[p.name] = 0;
        for (const g of allGrievances) {
            const pName = (g as any).priority?.name;
            if (pName) priorityCounts[pName] = (priorityCounts[pName] || 0) + 1;
        }

        const categoriesForMode = allCategories.filter(cat => {
            const code = (cat as any).type?.code;
            if (viewBy === 'department') return this.isDepartmentTypeCode(code);
            return true;
        });

        const categoryBreakdown = this.buildCategoryBreakdown(allGrievances, categoriesForMode);

        const scopedDepartments = departmentId
            ? departments.filter(d => d.id === departmentId)
            : departments;

        const departmentRows = this.buildDepartmentReportRows(scopedDepartments);
        const hostelRows: any[] = [];

        const departmentBreakdown = this.buildDepartmentBreakdownList(
            scopedDepartments,
            statusNames,
        );
        const hostelBreakdown: BreakdownEntry[] = [];

        const hodNameByDepartment = await this.resolveDepartmentHodNames(departments.map((d) => d.id));

        return {
            viewBy,
            total: allGrievances.length,
            statusCounts,
            priorityCounts,
            statusNames,
            departments: departments.map(d => ({
                id: d.id,
                name: d.name,
                hodName: hodNameByDepartment.get(d.id) || 'Department HOD',
            })),
            categories: categoriesForMode.map(c => ({
                id: c.id,
                name: c.name,
                typeCode: (c as any).type?.code || null,
                typeName: (c as any).type?.name || null,
            })),
            subCategories: subCategories.map(s => ({
                id: s.id,
                name: s.name,
                categoryId: s.category_id,
            })),
            categoryBreakdown,
            departmentRows,
            hostelRows,
            departmentBreakdown,
            departmentDetail: departmentId ? departmentBreakdown[0] || null : null,
            grievances: allGrievances,
            dateRange: { startDate: query.startDate, endDate: query.endDate },
            filters: {
                viewBy,
                department: query.department || 'All',
                category: query.category || 'All',
                subCategory: query.subCategory || 'All',
            },
        };
    }

    // ─── Excel generation ─────────────────────────────────────────────────────

    async generateAdminExcel(query: ReportQuery): Promise<Buffer> {
        const data = await this.getAdminReportData(query);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Grievance Portal';
        workbook.created = new Date();

        const colSpan = Math.max(5, data.statusNames.length + 2);
        const reportSheet = workbook.addWorksheet('Grievance Report');
        this.applySheetHeader(reportSheet, 'Grievance Report', colSpan);
        this.addAdminFullReportToSheet(reportSheet, data);

        reportSheet.getColumn(1).width = 32;
        reportSheet.getColumn(2).width = 16;
        reportSheet.getColumn(3).width = 14;
        reportSheet.getColumn(4).width = 14;
        reportSheet.getColumn(5).width = 14;

        return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // ─── PDF generation ───────────────────────────────────────────────────────

    async generateAdminPdf(query: ReportQuery): Promise<Buffer> {
        const data = await this.getAdminReportData(query);
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const W = doc.page.width - 100;

            doc.fontSize(18).font('Helvetica-Bold').text('Grievance Report', { align: 'center' });
            doc.fontSize(10).font('Helvetica');
            for (const line of this.buildAdminExportMeta(data)) {
                doc.text(line, { align: 'center' });
            }
            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke();
            doc.moveDown(0.8);

            // Summary (matches screen)
            this.pdfSectionHeader(doc, 'Summary');
            this.pdfTable(
                doc,
                ['Metric', 'Count'],
                [
                    ['Total Grievances', String(data.total)],
                    ...Object.entries(data.statusCounts).map(([k, v]) => [k, String(v)]),
                ],
                [W * 0.7, W * 0.3],
            );
            doc.moveDown(0.8);

            // Priority breakdown with share
            this.pdfSectionHeader(doc, 'Priority Breakdown');
            this.pdfTable(
                doc,
                ['Priority', 'Count', 'Share'],
                Object.entries(data.priorityCounts).map(([k, v]) => [
                    k,
                    String(v),
                    this.sharePercent(Number(v), data.total),
                ]),
                [W * 0.5, W * 0.25, W * 0.25],
            );
            doc.moveDown(0.8);

            // Status breakdown with share
            this.pdfSectionHeader(doc, 'Status Breakdown');
            this.pdfTable(
                doc,
                ['Status', 'Count', 'Share'],
                Object.entries(data.statusCounts).map(([k, v]) => [
                    k,
                    String(v),
                    this.sharePercent(Number(v), data.total),
                ]),
                [W * 0.5, W * 0.25, W * 0.25],
            );
            doc.moveDown(0.8);

            // Department section (matches screen)
            this.pdfSectionHeader(doc, '[Department] Department-wise Breakdown');
            if (data.departmentBreakdown?.length) {
                this.pdfSectionHeader(doc, '[Department] Grievances');
                const deptColWidths = [W * 0.35, W * 0.1, ...data.statusNames.map(() => W * 0.55 / data.statusNames.length)];
                this.pdfTable(
                    doc,
                    ['Department', 'Total', ...data.statusNames],
                    data.departmentBreakdown.map((dept: DepartmentReportRow) => [
                        dept.name,
                        String(dept.grievances.total),
                        ...data.statusNames.map((s: string) => String(dept.grievances.counts[s] || 0)),
                    ]),
                    deptColWidths,
                );
                doc.moveDown(0.5);
            } else {
                doc.fontSize(10).font('Helvetica').text('[Department] No department data available.');
            }
            doc.moveDown(0.8);

            doc.end();
        });
    }

    // ─── Excel styling helpers ────────────────────────────────────────────────

    private applySheetHeader(sheet: ExcelJS.Worksheet, title: string, colSpan: number) {
        sheet.addRow([title]);
        sheet.mergeCells(1, 1, 1, colSpan);
        const titleRow = sheet.getRow(1);
        titleRow.height = 30;
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.addRow([]);
    }

    private styleSectionHeader(row: ExcelJS.Row | undefined) {
        if (!row) return;
        row.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E6DA4' } };
    }

    private styleTableHeader(row: ExcelJS.Row | undefined) {
        if (!row) return;
        row.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7CA5' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            };
        });
    }

    // ─── PDF helpers ──────────────────────────────────────────────────────────

    private pdfSectionHeader(doc: PDFKit.PDFDocument, text: string) {
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1E3A5F').text(text);
        doc.fillColor('#000000').moveDown(0.4);
    }

    private pdfTable(
        doc: PDFKit.PDFDocument,
        headers: string[],
        rows: string[][],
        colWidths: number[],
    ) {
        const ROW_H = 18;
        const startX = 50;
        let y = doc.y;

        const drawRow = (cells: string[], isHeader: boolean) => {
            if (y + ROW_H > doc.page.height - 60) {
                doc.addPage();
                y = 50;
            }
            if (isHeader) {
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), ROW_H).fill('#3A7CA5');
            } else {
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), ROW_H).stroke('#CCCCCC');
            }

            let x = startX;
            for (let i = 0; i < cells.length; i++) {
                doc
                    .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(8)
                    .fillColor(isHeader ? '#FFFFFF' : '#000000')
                    .text(cells[i] || '-', x + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false, ellipsis: true });
                x += colWidths[i];
            }
            y += ROW_H;
        };

        drawRow(headers, true);
        for (const row of rows) drawRow(row, false);

        doc.y = y;
        doc.moveDown(0.5);
    }

    private buildRangeLabel(dateRange: { startDate?: string; endDate?: string }): string {
        if (!dateRange.startDate && !dateRange.endDate) return 'All time';
        if (dateRange.startDate && dateRange.endDate) return `${dateRange.startDate} to ${dateRange.endDate}`;
        if (dateRange.startDate) return `From ${dateRange.startDate}`;
        return `Up to ${dateRange.endDate}`;
    }

    private sharePercent(count: number, total: number): string {
        if (!total) return '0%';
        return `${Math.round((count / total) * 100)}%`;
    }

    private buildAdminExportMeta(data: any): string[] {
        const lines = [
            `Report Period: ${this.buildRangeLabel(data.dateRange)}`,
            `Generated On: ${this.fmt(new Date())}`,
            `Total Grievances: ${data.total}`,
        ];
        const filters = data.filters || {};
        if (filters.department && filters.department !== 'All') {
            const dept = (data.departments || []).find((d: any) => String(d.id) === String(filters.department));
            lines.push(`[Department] Filter: ${dept?.name || filters.department}`);
        }
        return lines;
    }

    private styleSectionHeaderDept(row: ExcelJS.Row | undefined) {
        if (!row) return;
        row.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    }

    private addAdminFullReportToSheet(sheet: ExcelJS.Worksheet, data: any) {
        this.addAdminOverviewToSheet(sheet, data);

        sheet.addRow([]);
        sheet.addRow(['[Department] Department-wise Breakdown']);
        this.styleSectionHeaderDept(sheet.lastRow);

        if (data.departmentBreakdown?.length) {
            sheet.addRow(['[Department] Grievances']);
            this.styleSectionHeaderDept(sheet.lastRow);
            sheet.addRow(['Department', 'Total', ...data.statusNames]);
            this.styleTableHeader(sheet.lastRow);
            for (const dept of data.departmentBreakdown) {
                sheet.addRow([
                    dept.name,
                    dept.grievances.total,
                    ...data.statusNames.map((s: string) => dept.grievances.counts[s] || 0),
                ]);
            }
            sheet.addRow([]);
        } else {
            sheet.addRow(['No department data available.']);
        }
    }

    private addAdminOverviewToSheet(sheet: ExcelJS.Worksheet, data: any) {
        for (const line of this.buildAdminExportMeta(data)) {
            sheet.addRow([line]);
        }
        sheet.addRow([]);

        sheet.addRow(['SUMMARY']);
        this.styleSectionHeader(sheet.lastRow);
        sheet.addRow(['Metric', 'Count']);
        this.styleTableHeader(sheet.lastRow);
        sheet.addRow(['Total Grievances', data.total]);
        for (const [status, count] of Object.entries(data.statusCounts)) {
            sheet.addRow([status, count]);
        }
        sheet.addRow([]);

        sheet.addRow(['PRIORITY BREAKDOWN']);
        this.styleSectionHeader(sheet.lastRow);
        sheet.addRow(['Priority', 'Count', 'Share']);
        this.styleTableHeader(sheet.lastRow);
        for (const [priority, count] of Object.entries(data.priorityCounts)) {
            sheet.addRow([priority, count, this.sharePercent(Number(count), data.total)]);
        }
        sheet.addRow([]);

        sheet.addRow(['STATUS BREAKDOWN']);
        this.styleSectionHeader(sheet.lastRow);
        sheet.addRow(['Status', 'Count', 'Share']);
        this.styleTableHeader(sheet.lastRow);
        for (const [status, count] of Object.entries(data.statusCounts)) {
            sheet.addRow([status, count, this.sharePercent(Number(count), data.total)]);
        }
    }
}
