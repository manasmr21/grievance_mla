import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtAuthModule } from '../../auth/jwt.module';
import { Notification } from './models/notification.model';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UserAccount } from '../userAccount/models/user.model';
import { Role } from '../roles/models/roles.model';
import { EmployeeDetails } from '../employeeDetails/models/employeeDetails.model';

@Module({
    imports: [
        SequelizeModule.forFeature([
            Notification,
            UserAccount,
            Role,
            EmployeeDetails,
        ]),
        JwtAuthModule,
    ],
    controllers: [NotificationController],
    providers: [NotificationGateway, NotificationService],
    exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
