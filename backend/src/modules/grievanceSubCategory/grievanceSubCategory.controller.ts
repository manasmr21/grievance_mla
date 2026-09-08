import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { GrievanceSubCategoryService } from './grievanceSubCategory.service';
import { GrievanceSubCategoryDto } from './dto/grievanceSubCategory.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Grievance Sub-Categories')
@Controller('grievance-sub-category')
export class GrievanceSubCategoryController {
  constructor(private readonly grievanceSubCategoryService: GrievanceSubCategoryService) { }

  @Post('create')
  @UseGuards(AuthGuard)
  async create(@Body() data: GrievanceSubCategoryDto, @Req() req: any) {
    return await this.grievanceSubCategoryService.createGrievanceSubCategory(data, req.user);
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return await this.grievanceSubCategoryService.getAllGrievanceSubCategories(page, limit);
  }

  @Get('category/:category_id')
  async getSubCategoriesByCategory(@Param('category_id') category_id: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.grievanceSubCategoryService.getGrievanceSubCategoriesByCategoryId(+category_id, page, limit, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.grievanceSubCategoryService.getGrievanceSubCategoryById(+id);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBody({ type: GrievanceSubCategoryDto })
  async update(@Param('id') id: string, @Body() data: Partial<GrievanceSubCategoryDto>, @Req() req: any) {
    return await this.grievanceSubCategoryService.updateGrievanceSubCategory(+id, data, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceSubCategoryService.deleteGrievanceSubCategory(+id, req.user);
  }

  @Delete('permanent/:id')
  @UseGuards(AuthGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.grievanceSubCategoryService.permanentDeleteGrievanceSubCategory(+id, req.user);
  }
}
