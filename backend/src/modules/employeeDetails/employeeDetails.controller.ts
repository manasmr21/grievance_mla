import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { EmployeeDetailsService } from "./employeeDetails.service";
import { EmployeeDetailsDto, UpdateEmployeeDetailsDto } from "./dto/employeeDetails.dto";
import { ApiBody } from "@nestjs/swagger";
import { AuthGuard } from "../../auth/jwt.guard";

@ApiTags('Employee Details')
@Controller('employee-details')
export class EmployeeDetailsController {
    constructor(private readonly employeeDetailsService: EmployeeDetailsService) { }

    @Post()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Create new employee details' })
    async create(@Body() data: EmployeeDetailsDto, @Req() req: any) {
        return await this.employeeDetailsService.createEmployeeDetails(data, req.user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all employee details' })
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role_id') role_id?: string,
        @Query('department_id') department_id?: string,
        @Query('assignable_only') assignable_only?: string,
    ) {
        return await this.employeeDetailsService.getAllEmployeeDetails(
            page,
            limit,
            role_id,
            department_id,
            assignable_only,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get employee details by ID' })
    async findOne(@Param('id') id: string) {
        return await this.employeeDetailsService.getEmployeeDetailsById(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Update employee details' })
    @ApiBody({ type: UpdateEmployeeDetailsDto })
    async update(@Param('id') id: string, @Body() data: UpdateEmployeeDetailsDto, @Req() req: any) {
        return await this.employeeDetailsService.updateEmployeeDetails(id, data, req.user);
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Soft delete employee details (deactivate)' })
    async remove(@Param('id') id: string, @Req() req: any) {
        return await this.employeeDetailsService.deleteEmployeeDetails(id, req.user);
    }

    @Delete('permanent/:id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Permanently delete employee details' })
    async permanentRemove(@Param('id') id: string, @Req() req: any) {
        return await this.employeeDetailsService.permanentDeleteEmployeeDetails(id, req.user);
    }
}
