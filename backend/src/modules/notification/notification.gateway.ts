import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@WebSocketGateway({
    namespace: 'notifications',
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket'],
    pingInterval: 25000,
    pingTimeout: 60000,
})
@Injectable()
export class NotificationGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server!: Server;

    constructor(private readonly jwtService: JwtService) {}

    async handleConnection(client: Socket) {
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
                console.log("Notification Socket: No JWT token provided for socket ID:", client.id);
                client.disconnect();
                return;
            }

            const payload = await this.jwtService.verifyAsync(token);
            client.data.user = payload;

            const userId = payload.id;

            // Join a private room unique to this user ID
            await client.join(`user_${userId}`);
            
            console.log(`Notification Socket: User connected: ${userId} (Socket ID: ${client.id})`);

            client.emit('connected', {
                success: true,
                userId: userId,
            });
        } catch (error) {
            console.log("Notification Socket: Auth failed:", error instanceof Error ? error.message : error);
            client.emit('error', {
                success: false,
                message: 'Unauthorized'
            });
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        if (user?.id) {
            console.log(`Notification Socket: User disconnected: ${user.id} (Socket ID: ${client.id})`);
        } else {
            console.log(`Notification Socket: Unauthenticated client disconnected (Socket ID: ${client.id})`);
        }
    }

    /**
     * Send real-time notification to a specific user
     */
    sendToUser(userId: number, notification: any) {
        this.server.to(`user_${userId}`).emit('newNotification', notification);
    }
}
