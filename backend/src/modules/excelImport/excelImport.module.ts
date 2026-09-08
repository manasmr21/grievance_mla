import { Module } from '@nestjs/common';
import { ExcelImportService } from './excelImport.service';
import { ExcelImportController } from './excelImport.controller';

@Module({
  providers: [ExcelImportService],
  controllers: [ExcelImportController],
  exports: [ExcelImportService],
})
export class ExcelImportModule {}
