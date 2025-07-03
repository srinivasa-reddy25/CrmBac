import { Types } from 'mongoose'

export interface Conversation {
  user: Types.ObjectId
  title?: string
  createdAt?: Date
  lastUpdated?: Date
  isArchived?: boolean
}
