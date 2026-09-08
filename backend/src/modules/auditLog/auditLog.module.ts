import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLog } from './models/auditLog.model';
import { UserAccount } from '../userAccount/models/user.model';
import { AuditLogController } from './auditLog.controller';
import { AuditLogService } from './auditLog.service';

@Module({
    imports: [SequelizeModule.forFeature([AuditLog, UserAccount])],
    controllers: [AuditLogController],
    providers: [AuditLogService],
    exports: [AuditLogService],
})
export class AuditLogModule { }
