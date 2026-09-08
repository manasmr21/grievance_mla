import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from './models/notification.model';
import { NotificationGateway } from './notification.gateway';
import { UserAccount } from '../userAccount/models/user.model';
import { Role } from '../roles/models/roles.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';
import { Op } from 'sequelize';
import { paginate } from '../../utils/pagination';
import { getPrimaryRoleId } from '../../utils/employee-role.utils';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification)
        private readonly notificationModel: typeof Notification,
        @InjectModel(UserAccount)
        private readonly userAccountModel: typeof UserAccount,
        @InjectModel(Role)
        private readonly roleModel: typeof Role,
        @InjectModel(EmployeeDetails)
        private readonly employeeDetailsModel: typeof EmployeeDetails,
        private readonly notificationGateway: NotificationGateway,
    ) {}

    /**
     * Create and dispatch a notification to a specific user
     */
    async createNotification(
        userId: number,
        title: string,
        message: string,
        type: string,
        entityType?: string,
        entityId?: string,
    ): Promise<Notification> {
        const notification = await this.notificationModel.create({
            user_id: userId,
            title,
            message,
            type,
            entity_type: entityType || null,
            entity_id: entityId || null,
            is_read: false,
        } as any);

        // Fetch user context if needed, or emit directly
        this.notificationGateway.sendToUser(userId, notification);

        return notification;
    }

    /**
     * Send notification to all admin users
     */
    async notifyAdmins(
        title: string,
        message: string,
        type: string,
        entityType?: string,
        entityId?: string,
    ): Promise<void> {
        try {
            const adminRole = await this.roleModel.findOne({
                where: { code: 'ADMIN' },
            });
            if (!adminRole) {
                console.error('NotificationService: Admin role not found.');
                return;
            }

            const admins = await this.userAccountModel.findAll({
                where: { role_id: adminRole.id, account_status: 'active' },
            });

            for (const admin of admins) {
                await this.createNotification(admin.id, title, message, type, entityType, entityId);
            }
        } catch (error) {
            console.error('NotificationService: Error notifying admins:', error);
        }
    }

    /**
     * Send notification to multiple employees by their employeeDetailsIds (UUIDs)
     */
    async notifyEmployees(
        employeeDetailsIds: string[],
        title: string,
        message: string,
        type: string,
        entityType?: string,
        entityId?: string,
    ): Promise<void> {
        try {
            if (!employeeDetailsIds || employeeDetailsIds.length === 0) return;

            const employees = await this.employeeDetailsModel.findAll({
                where: { id: employeeDetailsIds },
            });

            for (const employee of employees) {
                let email = employee.email;

                if (!email) {
                    const primaryRoleId = getPrimaryRoleId(employee);
                    const userAcc = primaryRoleId
                        ? await this.userAccountModel.findOne({
                            where: {
                                name: employee.name,
                                role_id: primaryRoleId,
                            },
                        })
                        : null;
                    if (userAcc) {
                        email = userAcc.email;
                    }
                }

                if (!email) {
                    console.warn(`NotificationService: Could not resolve email for employee: ${employee.name} (ID: ${employee.id})`);
                    continue;
                }

                const user = await this.userAccountModel.findOne({
                    where: { email },
                });

                if (user) {
                    await this.createNotification(user.id, title, message, type, entityType, entityId);
                } else {
                    console.warn(`NotificationService: UserAccount not found for email: ${email}`);
                }
            }
        } catch (error) {
            console.error('NotificationService: Error notifying employees:', error);
        }
    }

    async getNotifications(userId: number, page?: number | string, limit?: number | string): Promise<any> {
        return await paginate(
            this.notificationModel,
            {
                where: { user_id: userId },
                order: [['createdAt', 'DESC']],
            },
            page,
            limit
        );
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: number): Promise<boolean> {
        await this.notificationModel.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } },
        );
        return true;
    }

    /**
     * Mark a specific notification as read for a user
     */
    async markAsRead(notificationId: number, userId: number): Promise<Notification> {
        const notification = await this.notificationModel.findOne({
            where: { id: notificationId, user_id: userId },
        });

        if (!notification) {
            throw new HttpException('Notification not found', 404);
        }

        await notification.update({ is_read: true });
        return notification;
    }
}
