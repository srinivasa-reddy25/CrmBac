import mongoose, { Schema, Document, Model } from 'mongoose'
import { Conversation } from '../types/conversation'

export interface ConversationDocument extends Conversation, Document { }

const ConversationSchema = new Schema<ConversationDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Untitled Conversation' },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
})

// Index to sort conversations by user and recency
ConversationSchema.index({ user: 1, lastUpdated: -1 })

const ConversationModel: Model<ConversationDocument> =
    mongoose.models.Conversation || mongoose.model<ConversationDocument>('Conversation', ConversationSchema)

export default ConversationModel
