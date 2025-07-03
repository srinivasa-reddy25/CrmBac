import { Types } from 'mongoose'

export interface Tag {
  name: string
  color?: string
  createdBy?: Types.ObjectId
  usageCount?: number
  createdAt?: Date
  updatedAt?: Date
}
