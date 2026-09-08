import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { GrievanceChat } from "./models/chat.model";
import { CreateChatDto } from "./dto/chat.dto";
import { SendMessageDto } from "./dto/message.dto";
import { ChatService } from "./chat.service";
import { AuthGuard } from "../../auth/jwt.guard";

@UseGuards(AuthGuard)
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post()
    async createChat(@Body() data: CreateChatDto, @Req() req: any) {
        return await this.chatService.createChat(data, req?.user);
    }

    @Get(":id")
    async getChat(@Param("id") id: string) {
        return await this.chatService.getChat(id);
    }

    @Get(":id/messages")
    async getMessages(@Param("id") id: string) {
        return await this.chatService.getMessages(id);
    }

    @Post(":id/messages")
    async sendMessage(@Param("id") id: string, @Body() data: SendMessageDto, @Req() req: any) {
        return await this.chatService.sendMessage(id, data, req?.user);
    }

    @Post(":id/read")
    async markAsRead(@Param("id") id: string, @Req() req: any) {
        return await this.chatService.markAsRead(id, req?.user);
    }

}