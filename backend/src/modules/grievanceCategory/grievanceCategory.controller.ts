import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { GrievanceCategoryService } from './grievanceCategory.service';
import { GrievanceCategoryDto } from './dto/grievanceCategory.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Grievance Categories')
@Controller('grievance-category')
export class GrievanceCategoryController {
  constructor(private readonly grievanceCategoryService: GrievanceCategoryService) { }

  @Post('create')
  @UseGuards(AuthGuard)
  async create(@Body() data: GrievanceCategoryDto, @Req() req: any) {
    return await this.grievanceCategoryService.createGrievanceCategory(data, req.user);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.grievanceCategoryService.getAllGrievanceCategories(req.user, page, limit, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.grievanceCategoryService.getGrievanceCategoryById(+id);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBody({ type: GrievanceCategoryDto })
  async update(@Param('id') id: string, @Body() data: Partial<GrievanceCategoryDto>, @Req() req: any) {
    return await this.grievanceCategoryService.updateGrievanceCategory(+id, data, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceCategoryService.deleteGrievanceCategory(+id, req.user);
  }

  @Delete('permanent/:id')
  @UseGuards(AuthGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceCategoryService.permanentDeleteGrievanceCategory(+id, req.user);
  }
}
