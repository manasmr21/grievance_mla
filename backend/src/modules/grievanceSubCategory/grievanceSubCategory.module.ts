import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GrievanceSubCategoryService } from './grievanceSubCategory.service';
import { GrievanceSubCategoryController } from './grievanceSubCategory.controller';
import { GrievanceSubCategory } from './models/grievanceSubCategory.model';
import { GrievanceCategory } from '../grievanceCategory/models/grievanceCategory.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [SequelizeModule.forFeature([GrievanceSubCategory, GrievanceCategory]), AuditLogModule],
  providers: [GrievanceSubCategoryService],
  controllers: [GrievanceSubCategoryController],
  exports: [GrievanceSubCategoryService],
})
export class GrievanceSubCategoryModule {}
