import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelImportService } from './excelImport.service';
import { AuthGuard } from '../../auth/jwt.guard';
import { verifyAdmin } from '../../auth/verifyRoles';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Excel Import')
@Controller('excel-import')
export class ExcelImportController {
  constructor(private readonly excelImportService: ExcelImportService) {}

  @Post('import')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import Excel file into a specified database model' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        modelName: {
          type: 'string',
          description: 'The name of the database model to import into (e.g. EmployeeDetails)',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx or .xls)',
        },
      },
      required: ['modelName', 'file'],
    },
  })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('modelName') modelName: string,
    @Req() req: any,
  ) {
    // Verify admin privileges
    await verifyAdmin(req.user);

    return await this.excelImportService.importExcel(file, modelName);
  }
}
