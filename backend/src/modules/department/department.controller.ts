import { Controller, Get, Post, Body, Param, Put, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentDto } from './dto/department.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';
import { OptionalAuthGuard } from '../../auth/optional-auth.guard';

@ApiTags('Departments')
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) { }

  @Post('create')
  @UseGuards(AuthGuard)
  async create(@Body() data: DepartmentDto, @Req() req: any) {
    return await this.departmentService.createDepartment(data, req.user);
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('search') search?: string,
    @Query('includeCustomFields') includeCustomFields?: string,
    @Req() req?: any,
  ) {
    return await this.departmentService.getAllDepartments(
      page,
      limit,
      sortField,
      sortOrder,
      search,
      includeCustomFields === 'true',
      req?.user,
    );
  }

  @Get('my-assignments')
  @UseGuards(AuthGuard)
  async getMyAssignments(@Req() req: any) {
    return await this.departmentService.getMyAssignments(req.user);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Query('includeCustomFields') includeCustomFields?: string,
    @Req() req?: any,
  ) {
    return await this.departmentService.getDepartmentById(+id, includeCustomFields === 'true', req?.user);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBody({ type: DepartmentDto })
  async update(@Param('id') id: string, @Body() data: Partial<DepartmentDto>, @Req() req: any) {
    return await this.departmentService.updateDepartment(+id, data, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.departmentService.deleteDepartment(+id, req.user);
  }

  @Delete('permanent/:id')
  @UseGuards(AuthGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.departmentService.permanentDeleteDepartment(+id, req.user);
  }
}
