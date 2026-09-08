import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GrievancePath } from './models/grievancePath.model';
import { GrievancePathNode } from './models/grievancePathNode.model';
import { GrievancePathNodeRole } from './models/grievancePathNodeRole.model';
import { GrievancePathService } from './grievancePath.service';
import { GrievancePathController } from './grievancePath.controller';
import { AuditLogModule } from '../auditLog/auditLog.module';
import { Role } from '../roles/models/roles.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { GrievanceCategory } from '../grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from '../grievanceSubCategory/models/grievanceSubCategory.model';
import { GrievanceType } from '../grievanceType/models/grievanceType.model';
import { TicketPriority } from '../ticketPriority/models/ticketPriority.model';
import { UserAccount } from '../userAccount/models/user.model';
import { PathAssigneeResolver } from './helpers/path-assignee.resolver';

@Module({
    imports: [
        SequelizeModule.forFeature([
            GrievancePath,
            GrievancePathNode,
            GrievancePathNodeRole,
            Role,
            EmployeeDetails,
            GrievanceCategory,
            GrievanceSubCategory,
            GrievanceType,
            TicketPriority,
            UserAccount,
        ]),
        AuditLogModule,
    ],
    controllers: [GrievancePathController],
    providers: [GrievancePathService, PathAssigneeResolver],
    exports: [GrievancePathService, PathAssigneeResolver],
})
export class GrievancePathModule {}
