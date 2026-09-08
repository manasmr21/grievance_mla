import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from './models/roles.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Role]),
    AuditLogModule
  ],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule { }
