import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserAccountService } from './userAccount.service';
import { UserAccountController } from './userAccount.controller';
import { UserAccount } from './models/user.model';
import { Role } from '../roles/models/roles.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { Grievance } from '../grievances/models/grievance.model';
import { JwtAuthModule } from '../../auth/jwt.module';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      UserAccount,
      Role,
      EmployeeDetails,
    ]),
    JwtAuthModule,
    AuditLogModule,
  ],
  providers: [UserAccountService],
  controllers: [UserAccountController],
  exports: [UserAccountService],
})
export class UserAccountModule {}
