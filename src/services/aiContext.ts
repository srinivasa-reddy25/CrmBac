import mongoose from 'mongoose';
import UserModel from '../models/user.model';
import ContactModel from '../models/contact.model';
import ActivityModel from '../models/activity.model';
import ChatMessageModel from '../models/chatMessage.model';
import ConversationModel from '../models/conversation.model';

export async function getCrmContextForAi(
    userId: string,
    userMessage: string,
    conversationIdForAiMessage: string
): Promise<string> {
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new Error('User not found');

    const contacts = await ContactModel.find({ createdBy: userId })
        .sort({ lastInteraction: -1 })
        .populate('company', 'name')
        .populate('tags', 'name')
        .lean();

    const contactsWithSummary = contacts.map((contact: any) => contact.modifiedforAi || 'No summary available');

    const conversationObjectId = new mongoose.Types.ObjectId(conversationIdForAiMessage);

    const chatMessages = await ChatMessageModel.find({
        user: userId,
        conversationId: conversationObjectId
    })
        .sort({ timestamp: 1 })
        .lean();

    const chatSummary = chatMessages.map(msg => {
        return msg.sender === 'ai'
            ? `AI Response: ${msg.message}`
            : `User Message: ${msg.message}`;
    });

    const activities = await ActivityModel.find({ user: userId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

    const activitySummary = activities.map((activity: any) => activity.modifiedforAi || 'No summary');

    return `
You are a helpful AI assistant supporting a CRM user. Use the following context to understand their recent activity and provide relevant responses.

👤 User Information:
• Name: ${user.displayName}
• Email: ${user.email}
• Preference: ${user.preference || "N/A"}

📇 Recent Contacts:
${contactsWithSummary.join('\n')}

📌 Recent Activities:
${activitySummary.join('\n')}

💬 Recent Chat History:
${chatSummary.join('\n')}

📝 Current User Message:
"${userMessage}"

Respond helpfully using the above CRM context.
`.trim();
}
