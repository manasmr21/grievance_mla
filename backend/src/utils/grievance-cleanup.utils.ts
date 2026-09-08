import { Transaction } from 'sequelize';
import { Grievance } from '../modules/grievances/models/grievance.model';
import { GrievanceExecution } from '../modules/grievances/models/grievanceExecution.model';
import { GrievanceChat } from '../modules/grievanceChat/models/chat.model';
import { GrievanceMessages } from '../modules/grievanceChat/models/message.model';

export type GrievanceCleanupModels = {
    grievanceModel: typeof Grievance;
    grievanceExecutionModel: typeof GrievanceExecution;
    grievanceChatModel: typeof GrievanceChat;
    grievanceMessagesModel: typeof GrievanceMessages;
};

export async function deleteGrievanceDependents(
    grievanceId: string,
    models: GrievanceCleanupModels,
    transaction?: Transaction,
): Promise<void> {
    const opts = transaction ? { transaction } : {};

    await models.grievanceExecutionModel.destroy({
        where: { grievance_id: grievanceId },
        ...opts,
    });

    const chats = await models.grievanceChatModel.findAll({
        where: { grievance_id: grievanceId },
        attributes: ['id'],
        ...opts,
    });
    const chatIds = chats.map((chat) => chat.id);

    if (chatIds.length > 0) {
        await models.grievanceMessagesModel.destroy({
            where: { chat_id: chatIds },
            ...opts,
        });
        await models.grievanceChatModel.destroy({
            where: { id: chatIds },
            ...opts,
        });
    }

    await models.grievanceModel.destroy({
        where: { id: grievanceId },
        ...opts,
    });
}
