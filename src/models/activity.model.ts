import mongoose, { Schema, Document, Model } from 'mongoose'
import { Activity, ActivityAction } from '../types/activity'

export interface ActivityDocument extends Activity, Document {
    modifiedforAi?: string
}

const ActivitySchema = new Schema<ActivityDocument>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        enum: [
            'contact_created',
            'contact_updated',
            'contact_deleted',
            'bulk_import',
            'bulk_delete',
            'user_login',
        ],
        required: true,
    },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    entityName: { type: String },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
})

// Indexes
ActivitySchema.index({ user: 1, createdAt: -1 })
ActivitySchema.index({ entityType: 1 })

// Virtual field
ActivitySchema.virtual('modifiedforAi').get(function (this: ActivityDocument) {
    const name = this.entityName ? ` "${this.entityName}"` : ''
    return `• Performed "${this.action}" on ${this.entityType}${name} at ${this.timestamp?.toLocaleString()}.`
})

// Optional: Include virtuals in toJSON output
// ActivitySchema.set('toObject', { virtuals: true })
// ActivitySchema.set('toJSON', { virtuals: true })

const ActivityModel: Model<ActivityDocument> =
    mongoose.models.Activity || mongoose.model<ActivityDocument>('Activity', ActivitySchema)

export default ActivityModel
