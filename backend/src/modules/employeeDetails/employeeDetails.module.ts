import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { EmployeeDetails } from "./models/employeeDetails.model";
import { EmployeeDetailsService } from "./employeeDetails.service";
import { EmployeeDetailsController } from "./employeeDetails.controller";
import { Department } from "../department/models/department.model";
import { Role } from "../roles/models/roles.model";
import { UserAccount } from "../userAccount/models/user.model";
import { AuditLogModule } from "../auditLog/auditLog.module";
import { TableSchemaModule } from "../tableSchema/table-schema.module";

@Module({
    imports: [
        SequelizeModule.forFeature([EmployeeDetails, Department, Role, UserAccount]),
        AuditLogModule,
        TableSchemaModule,
    ],
    providers: [EmployeeDetailsService],
    controllers: [EmployeeDetailsController],
    exports: [EmployeeDetailsService],
})
export class EmployeeDetailsModule { }
