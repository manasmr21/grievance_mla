import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Grievance } from "./models/grievance.model";
import { GrievancesService } from "./grievances.service";
import { GrievancesController } from "./grievances.controller";
import { GrievanceCategory } from "../grievanceCategory/models/grievanceCategory.model";
import { GrievanceSubCategory } from "../grievanceSubCategory/models/grievanceSubCategory.model";
import { TicketStatus } from "../ticketStatus/models/ticketStatus.model";
import { TicketPriority } from "../ticketPriority/models/ticketPriority.model";
import { EmployeeDetails } from "../employeeDetails/models/employeeDetails.model";
import { GrievanceExecution } from "./models/grievanceExecution.model";
import { GrievanceChat } from "../grievanceChat/models/chat.model";
import { GrievanceMessages } from "../grievanceChat/models/message.model";
import { Department } from "../department/models/department.model";
import { CloudinaryModule } from "../../utils/cloudinary/cloudinary.module";
import { UserAccount } from "../userAccount/models/user.model";
import { Role } from "../roles/models/roles.model";
import { AuditLogModule } from "../auditLog/auditLog.module";
import { NotificationModule } from "../notification/notification.module";
import { MulterModule } from "@nestjs/platform-express";
import { multerConfig } from "../../utils/multer/multer.config";
import { AuditLog } from "../auditLog/models/auditLog.model";
import { GrievancePathModule } from "../grievancePath/grievancePath.module";
import { LocationModule } from "../location/location.module";
import { TableSchemaModule } from "../tableSchema/table-schema.module";

@Module({
    imports: [
        SequelizeModule.forFeature([
            Grievance,
            GrievanceCategory,
            GrievanceSubCategory,
            TicketStatus,
            TicketPriority,
            EmployeeDetails,
            GrievanceExecution,
            GrievanceChat,
            GrievanceMessages,
            Department,
            UserAccount,
            Role,
            AuditLog,
        ]),
        CloudinaryModule,
        AuditLogModule,
        NotificationModule,
        GrievancePathModule,
        LocationModule,
        TableSchemaModule,
        MulterModule.register(multerConfig)
    ],
    providers: [GrievancesService],
    controllers: [GrievancesController],
    exports: [GrievancesService],
})
export class GrievancesModule { }
