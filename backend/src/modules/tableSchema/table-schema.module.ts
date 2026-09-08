import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UiTable } from './models/ui-table.model';
import { UiTableColumn } from './models/ui-table-column.model';
import { TableSchemaService } from './table-schema.service';
import { SchemaSyncService } from './schema-sync.service';
import { TableSchemaController } from './table-schema.controller';
import { AuditLogModule } from '../auditLog/auditLog.module';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';

import { Role } from '../roles/models/roles.model';

@Module({
  imports: [
    SequelizeModule.forFeature([UiTable, UiTableColumn, EmployeeDetails, Role]),
    AuditLogModule,
  ],
  providers: [TableSchemaService, SchemaSyncService],
  controllers: [TableSchemaController],
  exports: [TableSchemaService, SchemaSyncService],
})
export class TableSchemaModule {}
