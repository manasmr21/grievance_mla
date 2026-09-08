import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaptchaModule } from './modules/captcha/captcha.module';
import { RolesModule } from './modules/roles/roles.module';
import { DepartmentModule } from './modules/department/department.module';
import { UserAccountModule } from './modules/userAccount/userAccount.module';
import { TicketPriorityModule } from './modules/ticketPriority/ticketPriority.module';
import { TicketStatusModule } from './modules/ticketStatus/ticketStatus.module';
import { GrievanceCategoryModule } from './modules/grievanceCategory/grievanceCategory.module';
import { GrievanceSubCategoryModule } from './modules/grievanceSubCategory/grievanceSubCategory.module';
import { GrievanceTypeModule } from './modules/grievanceType/grievanceType.module';
import { EmployeeDetailsModule } from './modules/employeeDetails/employeeDetails.module';
import { GrievancesModule } from './modules/grievances/grievances.module';
import { databaseConfig } from './config/database.config';
import { GrievanceChatModule } from './modules/grievanceChat/chat.module';
import { GrievancePathModule } from './modules/grievancePath/grievancePath.module';
import { AuditLogModule } from './modules/auditLog/auditLog.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ExcelImportModule } from './modules/excelImport/excelImport.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TableSchemaModule } from './modules/tableSchema/table-schema.module';
import { MenuModule } from './modules/menu/menu.module';
import { LocationModule } from './modules/location/location.module';
import { MailModule } from './utils/mail/sendMails.module';
import { multerConfig } from './utils/multer/multer.config';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    SequelizeModule.forRoot(databaseConfig),
    MailModule,
    MulterModule.register(
      multerConfig
    ),
    CaptchaModule,
    RolesModule,
    DepartmentModule,
    UserAccountModule,
    TicketPriorityModule,
    TicketStatusModule,
    GrievanceCategoryModule,
    GrievanceSubCategoryModule,
    GrievanceTypeModule,
    EmployeeDetailsModule,
    GrievancesModule,
    GrievanceChatModule,
    GrievancePathModule,
    AuditLogModule,
    NotificationModule,
    ExcelImportModule,
    ReportsModule,
    TableSchemaModule,
    MenuModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
