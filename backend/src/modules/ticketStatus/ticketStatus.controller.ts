import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TicketStatusService } from './ticketStatus.service';
import { TicketStatusDto } from './dto/ticketStatus.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Ticket Statuses')
@UseGuards(AuthGuard)
@Controller('ticket-status')
export class TicketStatusController {
  constructor(private readonly ticketStatusService: TicketStatusService) { }

  @Post('create')
  async create(@Body() data: TicketStatusDto, @Req() req: any) {
    return await this.ticketStatusService.createTicketStatus(data, req.user);
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.ticketStatusService.getAllTicketStatuses(page, limit, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ticketStatusService.getTicketStatusById(+id);
  }

  @Put('update/:id')
  @ApiBody({ type: TicketStatusDto })
  async update(@Param('id') id: string, @Body() data: Partial<TicketStatusDto>, @Req() req: any) {
    return await this.ticketStatusService.updateTicketStatus(+id, data, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return await this.ticketStatusService.deleteTicketStatus(+id, req.user);
  }

  @Delete('permanent/:id')
  async permanentRemove(@Param('id') id: string, @Req() req: any) {
    return await this.ticketStatusService.permanentDeleteTicketStatus(+id, req.user);
  }
}
