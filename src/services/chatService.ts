import ChatMessageModel from '../models/chatMessage.model';
import ConversationModel from '../models/conversation.model';
import { Types } from 'mongoose';

type SenderType = 'user' | 'ai';

export async function CreateConversation(userId: Types.ObjectId | string) {
    const conversation = new ConversationModel({
        user: userId,
        title: `Conversation - ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        lastUpdated: new Date(),
        isArchived: false,
    });

    await conversation.save();
    return conversation;
}

export async function saveMessage(
    userId: Types.ObjectId | string,
    messageText: string,
    sender: SenderType,
    conversationId: string
): Promise<any> {
    let conversation;

    // When a valid conversationId is provided
    if (conversationId && conversationId !== 'new') {
        conversation = await ConversationModel.findOne({
            _id: conversationId,
            user: userId,
            isArchived: false,
        });

        if (!conversation) {
            throw new Error('❌ Conversation not found or unauthorized');
        }
    } else {
        conversation = await CreateConversation(userId);
    }

    conversation.lastUpdated = new Date();
    await conversation.save();

    const message = new ChatMessageModel({
        user: userId,
        message: messageText,
        sender,
        timestamp: new Date(),
        conversationId: conversation._id,
        metadata: {
            messageType: 'text',
        },
    });

    await message.save();

    if (conversationId === 'new') {
        return {
            conversationId: conversation._id,
            message,
        };
    }

    return message;
}
