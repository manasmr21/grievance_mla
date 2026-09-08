import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GrievanceCategoryService } from './grievanceCategory.service';
import { GrievanceCategoryController } from './grievanceCategory.controller';
import { GrievanceCategory } from './models/grievanceCategory.model';
import { GrievanceType } from '../grievanceType/models/grievanceType.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [SequelizeModule.forFeature([GrievanceCategory, GrievanceType]), AuditLogModule],
  providers: [GrievanceCategoryService],
  controllers: [GrievanceCategoryController],
  exports: [GrievanceCategoryService],
})
export class GrievanceCategoryModule {}
