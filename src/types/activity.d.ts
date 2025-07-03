import { Types } from 'mongoose'

export type ActivityAction =
    | 'contact_created'
    | 'contact_updated'
    | 'contact_deleted'
    | 'bulk_import'
    | 'bulk_delete'
    | 'user_login'

export interface Activity {
    user: Types.ObjectId
    action: ActivityAction
    entityType?: string
    entityId?: Types.ObjectId
    entityName?: string
    details?: any
    timestamp?: Date
}
