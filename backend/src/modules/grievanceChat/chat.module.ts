import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { GrievanceChat } from "./models/chat.model";
import { GrievanceMessages } from "./models/message.model";
import { Grievance } from "../grievances/models/grievance.model";
import { UserAccount } from "../userAccount/models/user.model";
import { Role } from "../roles/models/roles.model";
import { JwtAuthModule } from "../../auth/jwt.module";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";

@Module({
    imports: [
        SequelizeModule.forFeature([GrievanceChat, GrievanceMessages, UserAccount, Role, Grievance]),
        JwtAuthModule
    ],
    controllers: [ChatController],
    providers: [ChatGateway, ChatService],
    exports: [ChatGateway, ChatService]
})

export class GrievanceChatModule { }
