import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { GrievanceChat } from "./models/chat.model";
import { GrievanceMessages } from "./models/message.model";
import { CreateChatDto } from "./dto/chat.dto";
import { SendMessageDto } from "./dto/message.dto";
import { ChatGateway } from "./chat.gateway";
import { Grievance } from "../grievances/models/grievance.model";
import { EmployeeDetails } from "../employeeDetails/models/employeeDetails.model";
import { UserAccount } from "../userAccount/models/user.model";
import { Role } from "../roles/models/roles.model";
import { attachPrimaryRole, getPrimaryRoleId } from "src/utils/employee-role.utils";


@Injectable()
export class ChatService {
    constructor(
        @InjectModel(GrievanceChat)
        private readonly chatModel: typeof GrievanceChat,
        @InjectModel(GrievanceMessages)
        private readonly messageModel: typeof GrievanceMessages,
        @InjectModel(Grievance)
        private readonly grievanceModel: typeof Grievance,
        private readonly chatGateway: ChatGateway,
        @InjectModel(Role)
        private readonly roleModel: typeof Role,
    ) { }

    private async enrichMessageSenders(messages: any[]) {
        if (!messages.length) return messages;

        const senders = messages
            .map((message) => message.sender?.get ? message.sender.get({ plain: true }) : message.sender)
            .filter(Boolean);

        const enrichedSenders = await attachPrimaryRole(senders, this.roleModel);
        const senderMap = new Map(enrichedSenders.map((sender) => [sender.id, sender]));

        return messages.map((message) => {
            const plain = message.get ? message.get({ plain: true }) : { ...message };
            if (plain.sender?.id) {
                plain.sender = senderMap.get(plain.sender.id) || plain.sender;
            }
            return plain;
        });
    }

    private async resolveFallbackUserAccountId(roleId: number): Promise<number> {
        try {
            const fallbackUser = await UserAccount.findOne({
                where: { role_id: roleId },
            });
            if (fallbackUser) {
                return fallbackUser.id;
            }
        } catch (err) {
            console.error(`Error finding fallback UserAccount for role ${roleId}:`, err);
        }

        try {
            const firstUser = await UserAccount.findOne();
            if (firstUser) {
                return firstUser.id;
            }
        } catch (err) {
            console.error("Error finding first UserAccount:", err);
        }

        return 1;
    }

    private async resolveComplainantUserId(
        idOrUuid: any,
        grievanceId: string,
        reqUserId?: number,
    ): Promise<number> {
        const parsed = Number(idOrUuid);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }

        if (typeof idOrUuid === 'string' && idOrUuid.length > 5) {
            try {
                const grievance =
                    (await this.grievanceModel.findByPk(idOrUuid)) ??
                    (grievanceId ? await this.grievanceModel.findByPk(grievanceId) : null);

                if (grievance?.full_name) {
                    if (reqUserId) {
                        return reqUserId;
                    }
                }
            } catch (err) {
                console.error(`Error resolving complainant from grievance ${idOrUuid}:`, err);
            }
        }

        if (reqUserId) {
            return reqUserId;
        }

        return this.resolveFallbackUserAccountId(1);
    }

    private async resolveEmployeeUserAccountId(idOrUuid: any, roleId: number): Promise<number> {
        const parsed = Number(idOrUuid);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }

        if (typeof idOrUuid === 'string' && idOrUuid.length > 5) {
            try {
                const employee = await EmployeeDetails.findByPk(idOrUuid);
                if (employee) {
                    const email = employee.email;
                    if (!email) {
                        const primaryRoleId = getPrimaryRoleId(employee);
                        const userAcc = primaryRoleId
                            ? await UserAccount.findOne({
                                where: {
                                    name: employee.name,
                                    role_id: primaryRoleId,
                                }
                            })
                            : null;
                        if (userAcc) {
                            return userAcc.id;
                        }
                    } else {
                        const userAcc = await UserAccount.findOne({ where: { email } });
                        if (userAcc) {
                            return userAcc.id;
                        }
                    }
                }
            } catch (err) {
                console.error(`Error resolving UserAccount.id for employee UUID ${idOrUuid}:`, err);
            }
        }

        return this.resolveFallbackUserAccountId(roleId);
    }

    async createChat(data: CreateChatDto, reqUser?: any) {
        try {
            const existing = await this.chatModel.findOne({
                where: { grievance_id: data.grievance_id }
            });
            if (existing) {
                if (Array.isArray(data.user2_ids) && data.user2_ids.length > 0) {
                    const currentIds: number[] = Array.isArray(existing.user2_ids) ? existing.user2_ids : [];
                    const currentRoleIds: number[] = Array.isArray(existing.user2_role_ids) ? existing.user2_role_ids : [];
                    const addedIds: number[] = [];
                    const addedRoleIds: number[] = [];

                    for (let i = 0; i < data.user2_ids.length; i++) {
                        const empId = data.user2_ids[i];
                        const roleId = Array.isArray(data.user2_role_ids) ? data.user2_role_ids[i] : (data.user2_role_ids || 2);
                        const accId = await this.resolveEmployeeUserAccountId(empId, Number(roleId));
                        if (!currentIds.includes(accId)) {
                            addedIds.push(accId);
                            addedRoleIds.push(Number(roleId));
                        }
                    }

                    if (addedIds.length > 0) {
                        await existing.update({
                            user2_ids: [...currentIds, ...addedIds],
                            user2_role_ids: [...currentRoleIds, ...addedRoleIds],
                        });
                        await existing.reload();
                    }
                }
                return existing;
            }

            const user1Id = await this.resolveComplainantUserId(
                data.user1_id,
                data.grievance_id,
                reqUser?.id,
            );

            const user2Ids: number[] = [];
            const user2RoleIds: number[] = [];

            if (Array.isArray(data.user2_ids)) {
                for (let i = 0; i < data.user2_ids.length; i++) {
                    const empId = data.user2_ids[i];
                    const roleId = Array.isArray(data.user2_role_ids) ? data.user2_role_ids[i] : (data.user2_role_ids || 2);
                    const accId = await this.resolveEmployeeUserAccountId(empId, Number(roleId));
                    user2Ids.push(accId);
                    user2RoleIds.push(Number(roleId));
                }
            }

            const chat = await this.chatModel.create({
                grievance_id: data.grievance_id,
                user1_id: user1Id,
                user2_ids: user2Ids,
                user1_role_id: Number(data.user1_role_id),
                user2_role_ids: user2RoleIds,
            });

            return chat;
        } catch (error) {
            const fs = require('fs');
            fs.appendFileSync('api_error.log', '\nCREATE_CHAT_ERROR: ' + (error instanceof Error ? error.stack : String(error)));
            throw error;
        }
    }

    async getChat(chatId: string) {
        return await this.chatModel.findByPk(chatId);
    }

    async getMessages(chatId: string) {
        const messages = await this.messageModel.findAll({
            where: { chat_id: chatId },
            include: [
                {
                    model: UserAccount,
                    as: 'sender',
                    attributes: ['id', 'name', 'email', 'role_id'],
                }
            ],
            order: [['createdAt', 'ASC']],
        });

        return this.enrichMessageSenders(messages);
    }

    async sendMessage(id: string, data: SendMessageDto, reqUser?: any) {
        let senderId = Number(data.sender_id);
        if (isNaN(senderId)) {
            senderId = reqUser?.id ?? await this.resolveFallbackUserAccountId(1);
        }

        const msg = await this.messageModel.create({
            chat_id: id,
            sender_id: senderId,
            message: data.message,
        });

        const fullMessage = await this.messageModel.findByPk(msg.id, {
            include: [
                {
                    model: UserAccount,
                    as: 'sender',
                    attributes: ['id', 'name', 'email', 'role_id'],
                }
            ]
        });

        const [enrichedMessage] = await this.enrichMessageSenders([fullMessage]);

        if (this.chatGateway && this.chatGateway.server) {
            this.chatGateway.server.to(id).emit('newMessage', enrichedMessage);
        }

        return enrichedMessage;
    }

    async markAsRead(chatId: string, reqUser?: any) {
        await this.messageModel.update(
            { is_read: true },
            { where: { chat_id: chatId } }
        );
        return { success: true };
    }
}
