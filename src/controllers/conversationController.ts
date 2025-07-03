import { Response } from 'express';
import mongoose from 'mongoose';

// Import your models (assuming they're properly typed)
import ConversationModel from '../models/conversation.model';
import UserModel from '../models/user.model';

// Import the custom types
import { RequestWithUser } from '../types/express/index'; // Adjust path as needed

// Interface for conversation query
interface ConversationQuery {
    user: mongoose.Types.ObjectId;
    isArchived: boolean;
}

// Interface for lean conversation document (what .lean() returns)
interface LeanConversationDocument {
    _id: any; // or string if you prefer
    user: any;
    isArchived: boolean;
    lastUpdated: Date;
    // Add other fields from your Conversation schema as needed
    title?: string;
    messages?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

export const getUserConversations = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return
        }

        const userId = user._id as mongoose.Types.ObjectId;

        const query: ConversationQuery = {
            user: userId,
            isArchived: false
        };

        const conversations = await ConversationModel.find(query)
            .sort({ lastUpdated: -1 });

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', (error as Error).message);
        res.status(500).json({ error: 'Internal server error' });
    }
}