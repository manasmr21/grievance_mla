import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Grievance } from '../grievances/models/grievance.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { Department } from '../department/models/department.model';
import { TicketStatus } from '../ticketStatus/models/ticketStatus.model';
import { TicketPriority } from '../ticketPriority/models/ticketPriority.model';
import { GrievanceCategory } from '../grievanceCategory/models/grievanceCategory.model';
import { GrievanceSubCategory } from '../grievanceSubCategory/models/grievanceSubCategory.model';
import { GrievanceType } from '../grievanceType/models/grievanceType.model';
import { Role } from '../roles/models/roles.model';

@Module({
    imports: [
        SequelizeModule.forFeature([
            Grievance,
            EmployeeDetails,
            Department,
            TicketStatus,
            TicketPriority,
            GrievanceCategory,
            GrievanceSubCategory,
            GrievanceType,
            Role,
        ]),
    ],
    providers: [ReportsService],
    controllers: [ReportsController],
    exports: [ReportsService],
})
export class ReportsModule { }
