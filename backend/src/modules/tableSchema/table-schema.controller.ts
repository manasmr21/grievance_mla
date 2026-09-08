import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { TableSchemaService } from './table-schema.service';
import { AddColumnDto } from './dto/add-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { AuthGuard } from '../../auth/jwt.guard';
import { verifyAdmin } from '../../auth/verifyRoles';

@ApiTags('Table Schema')
@Controller('table-schema')
export class TableSchemaController {
  constructor(private readonly tableSchemaService: TableSchemaService) {}

  @Get(':tableCode')
  @UseGuards(AuthGuard)
  async getTableSchema(@Param('tableCode') tableCode: string, @Req() req: any) {
    await verifyAdmin(req.user);
    return this.tableSchemaService.getTableSchema(tableCode);
  }

  @Post(':tableCode/columns')
  @UseGuards(AuthGuard)
  @ApiBody({ type: AddColumnDto })
  async addColumn(
    @Param('tableCode') tableCode: string,
    @Body() dto: AddColumnDto,
    @Req() req: any,
  ) {
    await verifyAdmin(req.user);
    return this.tableSchemaService.addColumn(tableCode, dto, req.user);
  }

  @Put(':tableCode/columns/:columnId')
  @UseGuards(AuthGuard)
  @ApiBody({ type: UpdateColumnDto })
  async updateColumn(
    @Param('tableCode') tableCode: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
    @Req() req: any,
  ) {
    await verifyAdmin(req.user);
    return this.tableSchemaService.updateColumn(tableCode, +columnId, dto, req.user);
  }

  @Delete(':tableCode/columns/:columnId')
  @UseGuards(AuthGuard)
  async deleteColumn(
    @Param('tableCode') tableCode: string,
    @Param('columnId') columnId: string,
    @Req() req: any,
  ) {
    await verifyAdmin(req.user);
    return this.tableSchemaService.deleteColumn(tableCode, +columnId, req.user);
  }
}
