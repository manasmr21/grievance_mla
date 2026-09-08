import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { GrievanceTypeService } from './grievanceType.service';
import { GrievanceTypeDto } from './dto/grievanceType.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Grievance Types')
@Controller('grievance-type')
export class GrievanceTypeController {
  constructor(private readonly grievanceTypeService: GrievanceTypeService) { }

  @Post('create')
  @UseGuards(AuthGuard)
  async create(@Body() data: GrievanceTypeDto, @Req() req: any) {
    return await this.grievanceTypeService.createGrievanceType(data, req.user);
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return await this.grievanceTypeService.getAllGrievanceTypes(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.grievanceTypeService.getGrievanceTypeById(+id);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBody({ type: GrievanceTypeDto })
  async update(@Param('id') id: string, @Body() data: Partial<GrievanceTypeDto>, @Req() req: any) {
    return await this.grievanceTypeService.updateGrievanceType(+id, data, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceTypeService.deleteGrievanceType(+id, req.user);
  }

  @Delete('permanent/:id')
  @UseGuards(AuthGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceTypeService.permanentDeleteGrievanceType(+id, req.user);
  }
}
