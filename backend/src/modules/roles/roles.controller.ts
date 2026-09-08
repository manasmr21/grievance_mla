import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './models/roles.model';
import { RoleDto } from './dto/roles.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post('create')
  @UseGuards(AuthGuard)
  async create(@Body() data: RoleDto, @Req() req: any) {
    return await this.rolesService.createRole(data, req.user);
  }

  @Get('menu-assignments')
  @UseGuards(AuthGuard)
  async findAllForMenu(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.rolesService.getAllRolesForMenu(page, limit, search);
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.rolesService.getAllRoles(page, limit, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.rolesService.getRoleById(+id);
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  @ApiBody({ type: RoleDto })
  async update(@Param('id') id: string, @Body() data: Partial<RoleDto>, @Req() req: any) {
    return await this.rolesService.updateRole(+id, data, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.rolesService.deleteRole(+id, req.user);
  }

  @Delete('permanent/:id')
  @UseGuards(AuthGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.rolesService.permanentDeleteRole(+id, req.user);
  }
}
