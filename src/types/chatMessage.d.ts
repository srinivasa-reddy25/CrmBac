import { Types } from 'mongoose'

export type SenderType = 'user' | 'ai'

export interface ChatMessage {
    user: Types.ObjectId
    message: string
    sender: SenderType
    timestamp?: Date
    conversationId: Types.ObjectId
}
