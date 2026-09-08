import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import * as cookie from "cookie";

import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/sequelize';
import { GrievanceChat } from './models/chat.model';
import { GrievanceMessages } from './models/message.model';
import { UserAccount } from 'src/modules/userAccount/models/user.model';
import { Role } from 'src/modules/roles/models/roles.model';
import { attachPrimaryRole } from 'src/utils/employee-role.utils';

@WebSocketGateway({
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket'],
    pingInterval: 25000,
    pingTimeout: 60000,
})
export class ChatGateway
    implements
    OnGatewayConnection,
    OnGatewayDisconnect {
        
    @WebSocketServer()
    server!: Server;

    private connectedUsers: Map<string, string> = new Map();

    constructor(
        private jwtService: JwtService,
        @InjectModel(GrievanceChat) private chatModel: typeof GrievanceChat,
        @InjectModel(GrievanceMessages) private messageModel: typeof GrievanceMessages,
        @InjectModel(Role) private roleModel: typeof Role,
    ) { }

    async handleConnection(
        client: Socket,
    ) {
        try {
            let token: string | undefined = undefined;

            const rawCookie = client.handshake.headers.cookie;
            if (rawCookie) {
                const parsedCookies = cookie.parse(rawCookie);
                token = parsedCookies["user"];
            }

            if (!token && client.handshake.auth) {
                token = client.handshake.auth.token;
            }

            if (!token && client.handshake.query) {
                token = client.handshake.query.token as string;
            }

            if (!token) {
                console.log("No JWT token provided for socket ID:", client.id);
                client.disconnect();
                return;
            }

            const payload = await this.jwtService.verifyAsync(token);

            client.data.user = payload;

            this.connectedUsers.set(payload.id, client.id);

            console.log("User connected:", payload.id);

            client.emit('connected', {
                success: true,
                userId: payload.id,
            });

        } catch (error) {
            console.log("WebSocket authentication failed:", error instanceof Error ? error.message : error);
            client.emit('error', {
                success: false,
                message: 'Unauthorized'
            });

            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        const user = client.data?.user;

        if (user?.id) {
            this.connectedUsers.delete(user.id);
            console.log("Authenticated user disconnected:", user.id);
        } else {
            console.log("Unauthenticated client disconnected. Socket ID:", client.id);
        }
    }

    @SubscribeMessage('joinChat')
    async joinChat(
        @MessageBody()
        data: {
            chatId: string;
        },
        @ConnectedSocket()
        client: Socket,
    ) {
        const user = client.data.user;

        const chat = await this.chatModel.findByPk(data.chatId, {
            include: [
                { model: UserAccount, as: 'user1', attributes: ['id', 'name', 'email'] },
                { model: Role, as: 'user1_role', attributes: ['id', 'name', 'code'] }
            ]
        });

        if (!chat) {
            client.emit('error', { message: 'Chat not found' });
            return;
        }

        const isUser2 = Array.isArray(chat.user2_ids) && chat.user2_ids.includes(user.id);
        if (chat.user1_id !== user.id && !isUser2) {
            client.emit('error', { message: 'Unauthorized to join this chat' });
            return;
        }

        await client.join(data.chatId);

        client.emit('joinedChat', {
            chatId: data.chatId,
            chatDetails: chat
        });
    }

    @SubscribeMessage('leaveChat')
    async leaveChat(
        @MessageBody()
        data: {
            chatId: string;
        },
        @ConnectedSocket()
        client: Socket,
    ) {
        await client.leave(data.chatId);

        client.emit('leftChat', {
            chatId: data.chatId,
        });
    }

    @SubscribeMessage('sendMessage')
    async sendMessage(
        @MessageBody()
        data: {
            chatId: string;
            message: string;
        },
        @ConnectedSocket()
        client: Socket,
    ): Promise<any> {
        const sender = client.data.user;

        const chat = await this.chatModel.findByPk(data.chatId);

        if (!chat) {
            client.emit('error', { message: 'Chat not found' });
            return;
        }

        const isUser2 = Array.isArray(chat.user2_ids) && chat.user2_ids.includes(sender.id);
        if (chat.user1_id !== sender.id && !isUser2) {
            client.emit('error', { message: 'Unauthorized to send messages in this chat' });
            return;
        }

        const savedMessage = await this.messageModel.create({
            chat_id: data.chatId,
            sender_id: sender.id,
            message: data.message,
        });

        const fullMessage = await this.messageModel.findByPk(savedMessage.id, {
            include: [
                {
                    model: UserAccount,
                    as: 'sender',
                    attributes: ['id', 'name', 'email', 'role_ids'],
                }
            ]
        });

        const plainMessage = fullMessage?.get({ plain: true }) as any;
        const enrichedMessage = plainMessage?.sender
            ? {
                ...plainMessage,
                sender: (await attachPrimaryRole([plainMessage.sender], this.roleModel))[0],
            }
            : plainMessage;

        this.server
            .to(data.chatId)
            .emit(
                'newMessage',
                enrichedMessage,
            );

        return enrichedMessage;
    }
}