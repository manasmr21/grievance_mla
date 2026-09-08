import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TicketStatusService } from './ticketStatus.service';
import { TicketStatusController } from './ticketStatus.controller';
import { TicketStatus } from './models/ticketStatus.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TicketStatus]),
    AuditLogModule
  ],
  providers: [TicketStatusService],
  controllers: [TicketStatusController],
  exports: [TicketStatusService],
})
export class TicketStatusModule {}
