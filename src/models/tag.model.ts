import mongoose, { Schema, Document, Model } from 'mongoose'
import { Tag } from '../types/tag'

export interface TagDocument extends Tag, Document { }

const TagSchema: Schema<TagDocument> = new Schema(
    {
        name: { type: String, required: true },
        color: { type: String, default: '#gray' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        usageCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
)

TagSchema.index({ name: 1, createdBy: 1 }, { unique: true })


TagSchema.pre('save', function (next) {
    this.updatedAt = new Date()
    next()
})

const TagModel: Model<TagDocument> = mongoose.models.Tag || mongoose.model<TagDocument>('Tag', TagSchema)

export default TagModel
