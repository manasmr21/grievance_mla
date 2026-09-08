import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { MenuItemDto } from './dto/menu.dto';
import { AuthGuard } from '../../auth/jwt.guard';
import { AdminGuard } from '../../auth/admin.guard';

@ApiTags('Menus')
@Controller('menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMyMenu(@Query('roleCode') roleCode: string, @Req() req: any) {
    return await this.menuService.getMenuForRoleCode(roleCode, req.user);
  }

  @Get('tree')
  @UseGuards(AdminGuard)
  async getMenuTree() {
    return await this.menuService.getMenuTree();
  }

  @Get()
  @UseGuards(AdminGuard)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return await this.menuService.getAllMenus(page, limit, search);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBody({ type: MenuItemDto })
  async create(@Body() data: MenuItemDto, @Req() req: any) {
    return await this.menuService.createMenu(data, req.user);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBody({ type: MenuItemDto })
  async update(@Param('id') id: string, @Body() data: Partial<MenuItemDto>, @Req() req: any) {
    return await this.menuService.updateMenu(+id, data, req.user);
  }

  @Delete(':id/permanent')
  @UseGuards(AdminGuard)
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.menuService.permanentDeleteMenu(+id, req.user);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.menuService.softDeleteMenu(+id, req.user);
  }
}
