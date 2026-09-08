import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { MenuItem } from './models/menu-item.model';
import { RoleMenuItem } from './models/role-menu-item.model';
import { Role } from '../roles/models/roles.model';

@Module({
  imports: [SequelizeModule.forFeature([MenuItem, RoleMenuItem, Role])],
  providers: [MenuService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
