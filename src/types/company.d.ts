import { Types } from 'mongoose'

export interface Company {
    name: string
    industry?: string
    website?: string
    address?: string
    phone?: string
    email?: string
    description?: string
    createdBy?: Types.ObjectId
    createdAt?: Date
    updatedAt?: Date
}
