import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GrievanceTypeService } from './grievanceType.service';
import { GrievanceTypeController } from './grievanceType.controller';
import { GrievanceType } from './models/grievanceType.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [SequelizeModule.forFeature([GrievanceType]), AuditLogModule],
  providers: [GrievanceTypeService],
  controllers: [GrievanceTypeController],
  exports: [GrievanceTypeService],
})
export class GrievanceTypeModule {}
