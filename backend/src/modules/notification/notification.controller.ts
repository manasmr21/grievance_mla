import { Controller, Get, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../../auth/jwt.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
    async getNotifications(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
        const userId = req.user.id;
        return await this.notificationService.getNotifications(userId, page, limit);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    async markAllAsRead(@Req() req: any) {
        const userId = req.user.id;
        await this.notificationService.markAllAsRead(userId);
        return {
            success: true,
            message: 'All notifications marked as read',
        };
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark a specific notification as read' })
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        const notification = await this.notificationService.markAsRead(Number(id), userId);
        return {
            success: true,
            message: 'Notification marked as read',
            data: notification,
        };
    }
}
