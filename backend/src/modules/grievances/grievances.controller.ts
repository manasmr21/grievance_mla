import { Body, Controller, Delete, Get, Param, Patch, Post, UseInterceptors, UploadedFile, UseGuards, Req, Query } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { GrievancesService } from "./grievances.service";
import { AuthGuard } from "../../auth/jwt.guard";
import { GrievanceDto, UpdateGrievanceDto, AssignGrievanceDto, ReopenGrievanceDto, ForwardGrievanceDto } from "./dto/grievance.dto";
import { PublicGrievanceDto } from "./dto/publicGrievance.dto";
import { TrackPublicGrievanceDto } from "./dto/trackPublicGrievance.dto";
import { multerConfig } from "../../utils/multer/multer.config";

@ApiTags('Grievances')
@Controller('grievances')
export class GrievancesController {
    constructor(
        private readonly grievancesService: GrievancesService,
    ) { }

    @Post()
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('file', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Submit a new grievance' })
    @ApiBody({ type: GrievanceDto })
    async create(
        @Body() data: GrievanceDto,
        @Req() req: any,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return await this.grievancesService.createGrievance(data, req.user, file);
    }

    @Get('public/categories')
    @ApiOperation({ summary: 'List active grievance categories (public form)' })
    getPublicCategories() {
        return this.grievancesService.getPublicCategories();
    }

    @Post('public')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Submit a public grievance (no auth)' })
    @ApiBody({ type: PublicGrievanceDto })
    createPublic(
        @Body() data: PublicGrievanceDto,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<any> {
        return this.grievancesService.createPublicGrievance(data, file);
    }

    @Get('public/track')
    @ApiOperation({ summary: 'Track a public grievance by ticket number and mobile (no auth)' })
    trackPublic(@Query() query: TrackPublicGrievanceDto): Promise<any> {
        return this.grievancesService.trackPublicGrievance(query.ticket_no, query.mobile_number);
    }

    @Get()
    @ApiOperation({ summary: 'Get all grievances' })
    async findAll(@Query() query: any) {
        return await this.grievancesService.getAllGrievances(query);
    }

    @Get('role/:roleId')
    @ApiOperation({ summary: 'Get grievances by role ID' })
    async findByRoleId(@Param('roleId') roleId: string, @Query() query: any) {
        return await this.grievancesService.getGrievancesByRoleId(Number(roleId), query);
    }

    @Get('employee/:employeeId')
    @ApiOperation({ summary: 'Get grievances by assigned employee ID' })
    async findByEmployeeId(@Param('employeeId') employeeId: string, @Query() query: any) {
        return await this.grievancesService.getGrievancesByEmployeeId(employeeId, query);
    }

    @Get('ticket/:ticketNo')
    @ApiOperation({ summary: 'Get grievance by ticket number' })
    async findByTicketNo(@Param('ticketNo') ticketNo: string) {
        return await this.grievancesService.getGrievanceByTicketNumber(ticketNo);
    }

    @Get('employees')
    @ApiOperation({ summary: 'Get grievances by one or more employee IDs (comma-separated or repeated query param)' })
    async findByEmployeeIds(@Query() query: any) {
        // Support both ?employee_ids=id1,id2 and ?employee_ids=id1&employee_ids=id2
        const rawIds: string | string[] = query.employee_ids;
        if (!rawIds) {
            return { success: false, message: 'employee_ids query param is required', statusCode: 400 };
        }
        const employeeIds: string[] = (Array.isArray(rawIds) ? rawIds : rawIds.split(','))
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0);
        const { employee_ids: _removed, ...rest } = query;
        return await this.grievancesService.getGrievancesByEmployeeIds(employeeIds, rest);
    }

    @Get(':id/timeline')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Get grievance activity timeline (read-only)' })
    async getTimeline(@Param('id') id: string, @Req() req: any) {
        return await this.grievancesService.getGrievanceTimeline(id, req?.user);
    }

    @Post(':id/forward')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Forward grievance to the next path node or reassign by role at terminal node' })
    @ApiBody({ type: ForwardGrievanceDto, required: false })
    async forward(@Param('id') id: string, @Body() body: ForwardGrievanceDto, @Req() req: any) {
        return await this.grievancesService.forwardGrievance(id, req.user, body);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get grievance by ID' })
    async findOne(@Param('id') id: string) {
        return await this.grievancesService.getGrievanceById(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Update grievance details' })
    @ApiBody({ type: UpdateGrievanceDto })
    async update(@Param('id') id: string, @Body() data: UpdateGrievanceDto, @Req() req: any) {
        return await this.grievancesService.updateGrievance(id, data, req?.user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete grievance' })
    async remove(@Param('id') id: string, @Req() req: any) {
        return await this.grievancesService.deleteGrievance(id, req?.user);
    }

    @Patch(':id/reopen')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Reopen a resolved grievance' })
    @ApiBody({ type: ReopenGrievanceDto })
    async reopen(@Param('id') id: string, @Body() data: ReopenGrievanceDto, @Req() req: any) {
        return await this.grievancesService.reopenGrievance(id, data.remark, req.user);
    }

    @Patch(':id/assign')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Assign grievance to another employee' })
    @ApiBody({ type: AssignGrievanceDto })
    async assignGrievance(@Param('id') id: string, @Body() data: AssignGrievanceDto, @Req() req: any) {
        return await this.grievancesService.assignGrievance(id, data.employee_ids, req.user);
    }
}
