import mongoose, { Schema, Document, Model } from 'mongoose'
import { Company } from '../types/company'

export interface CompanyDocument extends Company, Document { }

const CompanySchema = new Schema<CompanyDocument>({
    name: { type: String, required: true },
    industry: { type: String },
    website: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
})

// Pre-save hook to update `updatedAt`
CompanySchema.pre('save', function (next) {
    this.updatedAt = new Date()
    next()
})

// Compound index to ensure unique name per creator
CompanySchema.index({ name: 1, createdBy: 1 }, { unique: true })

const CompanyModel: Model<CompanyDocument> =
    mongoose.models.Company || mongoose.model<CompanyDocument>('Company', CompanySchema)

export default CompanyModel
