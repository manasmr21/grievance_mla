import { Controller, Post, Get, Body, Put, Delete, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { GrievancePathService } from './grievancePath.service';
import { CreateGrievancePathDto, UpdateGrievancePathDto } from './dto/grievancePath.dto';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Grievance Paths')
@Controller('grievance-paths')
export class GrievancePathController {
    constructor(private readonly grievancePathService: GrievancePathService) {}

    @Post()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Create a grievance path' })
    @ApiBody({ type: CreateGrievancePathDto })
    create(@Body() dto: CreateGrievancePathDto, @Req() req: any) {
        return this.grievancePathService.createPath(dto, req?.user);
    }

    @Get()
    @ApiOperation({ summary: 'List grievance paths' })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortField') sortField?: string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        return this.grievancePathService.getPaths(page, limit, sortField, sortOrder);
    }

    @Put('update/:id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Update a grievance path' })
    update(@Param('id') id: string, @Body() data: UpdateGrievancePathDto, @Req() req: any) {
        return this.grievancePathService.updatePath(+id, data, req?.user);
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Deactivate a grievance path' })
    remove(@Param('id') id: string, @Req() req: any) {
        return this.grievancePathService.softDeletePath(+id, req?.user);
    }

    @Delete('permanent/:id')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Permanently delete a grievance path' })
    permanentRemove(@Param('id') id: string, @Req() req: any) {
        return this.grievancePathService.deletePath(+id, req?.user);
    }
}
