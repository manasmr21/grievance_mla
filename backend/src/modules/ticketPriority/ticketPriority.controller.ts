import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TicketPriorityService } from './ticketPriority.service';
import { TicketPriorityDto } from './dto/ticketPriority.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Ticket Priorities')
@UseGuards(AuthGuard)
@Controller('ticket-priority')
export class TicketPriorityController {
  constructor(private readonly ticketPriorityService: TicketPriorityService) { }

  @Post('create')
  async create(@Body() data: TicketPriorityDto, @Req() req: any) {
    return await this.ticketPriorityService.createTicketPriority(data, req.user);
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return await this.ticketPriorityService.getAllTicketPriorities(page, limit, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.ticketPriorityService.getTicketPriorityById(+id);
  }

  @Put('update/:id')
  @ApiBody({ type: TicketPriorityDto })
  async update(@Param('id') id: string, @Body() data: Partial<TicketPriorityDto>, @Req() req: any) {
    return await this.ticketPriorityService.updateTicketPriority(+id, data, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete ticket priority (deactivate)' })
  async remove(@Param('id') id: number, @Req() req: any) {
    return await this.ticketPriorityService.deleteTicketPriority(id, req.user);
  }

  @Delete('permanent/:id')
  @ApiOperation({ summary: 'Permanently delete ticket priority' })
  async permanentRemove(@Param('id') id: number, @Req() req: any) {
    return await this.ticketPriorityService.permanentDeleteTicketPriority(id, req.user);
  }
}