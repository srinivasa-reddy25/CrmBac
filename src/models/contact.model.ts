import mongoose, { Schema, Document, Model } from 'mongoose'
import { Contact } from '../types/contact'
import ActivityModel from './activity.model' // Adjust the path based on your file location

export interface ContactDocument extends Contact, Document {
    _wasNew?: boolean
    _toDelete?: ContactDocument | null
    modifiedforAi?: string
}

const ContactSchema = new Schema<ContactDocument>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: String,
        company: { type: Schema.Types.ObjectId, ref: 'Company' },
        tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
        notes: String,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: Date,
        updatedAt: Date,
        lastInteraction: Date,
    },
    { timestamps: true }
)

// Pre-save: Track if new
ContactSchema.pre('save', function (next) {
    this._wasNew = this.isNew
    next()
})

// Unique compound index
ContactSchema.index({ email: 1, createdBy: 1 }, { unique: true })

// Text search index
ContactSchema.index({ name: 'text', email: 'text' })

// Post-save: Log activity if new
ContactSchema.post('save', async function (doc, next) {
    if (this._wasNew) {
        console.log('New contact created:', doc.name)
        try {
            await ActivityModel.create({
                user: doc.createdBy,
                action: 'contact_created',
                entityType: 'contact',
                entityId: doc._id,
                entityName: doc.name,
                details: {
                    contactName: doc.name,
                    company: doc.company,
                    email: doc.email,
                },
            })
        } catch (err) {
            console.error('Activity logging failed (creation):', err)
        }
    }
    next()
})

// Pre-delete: Load doc for logging
ContactSchema.pre('findOneAndDelete', async function (next) {
    (this as any)._toDelete = await this.model.findOne(this.getQuery())
    next()
})

// Post-delete: Log deletion activity
ContactSchema.post('findOneAndDelete', async function (_result, next) {
    const deletedContact = (this as any)._toDelete
    if (!deletedContact) return next()

    try {
        await ActivityModel.create({
            user: deletedContact.createdBy,
            action: 'contact_deleted',
            entityType: 'contact',
            entityId: deletedContact._id,
            entityName: deletedContact.name,
            details: {
                contactName: deletedContact.name,
                email: deletedContact.email,
                company: deletedContact.company,
            },
        })
    } catch (err) {
        console.error('Activity logging failed (delete):', err)
    }

    next()
})

// Virtual: modifiedforAi
ContactSchema.virtual('modifiedforAi').get(function (this: ContactDocument) {
    return `${this.name} can be reached at ${this.email}. They are currently employed at ${this.company ? this.company : 'an unknown company'}. The last recorded interaction was on ${this.lastInteraction ? this.lastInteraction.toLocaleDateString() : 'an unknown date'}. Notes: ${this.notes || 'No notes available'}. Tags associated: ${this.tags && this.tags.length > 0 ? this.tags.join(', ') : 'No tags'}.`
})

// If you want virtuals in JSON output
// ContactSchema.set('toObject', { virtuals: true })
// ContactSchema.set('toJSON', { virtuals: true })

const ContactModel: Model<ContactDocument> =
    mongoose.models.Contact || mongoose.model<ContactDocument>('Contact', ContactSchema)

export default ContactModel
