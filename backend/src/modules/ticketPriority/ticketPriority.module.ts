import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TicketPriorityService } from './ticketPriority.service';
import { TicketPriorityController } from './ticketPriority.controller';
import { TicketPriority } from './models/ticketPriority.model';
import { AuditLogModule } from '../auditLog/auditLog.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TicketPriority]),
    AuditLogModule
  ],
  providers: [TicketPriorityService],
  controllers: [TicketPriorityController],
  exports: [TicketPriorityService],
})
export class TicketPriorityModule {}
