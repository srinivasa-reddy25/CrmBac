import { Types } from 'mongoose'

export interface Contact {
    name: string
    email: string
    phone?: string
    company?: Types.ObjectId
    tags?: Types.ObjectId[]
    notes?: string
    createdBy?: Types.ObjectId
    createdAt?: Date
    updatedAt?: Date
    lastInteraction?: Date
}
