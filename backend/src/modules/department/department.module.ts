import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { Department } from './models/department.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { UserAccount } from '../userAccount/models/user.model';
import { Role } from '../roles/models/roles.model';
import { AuditLogModule } from '../auditLog/auditLog.module';
import { TableSchemaModule } from '../tableSchema/table-schema.module';

@Module({
  imports: [SequelizeModule.forFeature([Department, EmployeeDetails, UserAccount, Role]), AuditLogModule, TableSchemaModule],
  providers: [DepartmentService],
  controllers: [DepartmentController],
  exports: [DepartmentService],
})
export class DepartmentModule {}
