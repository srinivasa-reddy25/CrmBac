import mongoose, { Schema, Document, Model } from 'mongoose'
import { ChatMessage, SenderType } from '../types/chatMessage'

export interface ChatMessageDocument extends ChatMessage, Document { }

const ChatMessageSchema = new Schema<ChatMessageDocument>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    sender: {
        type: String,
        enum: ['user', 'ai'],
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
})

const ChatMessageModel: Model<ChatMessageDocument> =
    mongoose.models.ChatMessage ||
    mongoose.model<ChatMessageDocument>('ChatMessage', ChatMessageSchema)

export default ChatMessageModel
