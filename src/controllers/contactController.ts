import { Response } from 'express'
import { validationResult } from 'express-validator'
import mongoose from 'mongoose'

import ContactModel from '../models/contact.model'
import ActivityModel from '../models/activity.model'
import TagModel from '../models/tag.model'
import CompanyModel from '../models/company.model'
import UserModel from '../models/user.model'

import { RequestWithUser } from '../types/express'

interface ContactQuery {
    createdBy: mongoose.Types.ObjectId
    tags?: string | { $all: string[] } | { $in: string[] }
    $or?: Array<{
        name?: { $regex: string; $options: string }
        email?: { $regex: string; $options: string }
    }>
}

interface ContactData {
    name?: string
    email?: string
    phone?: string
    company?: string
    notes?: string
    tags?: string[]
}

interface BulkDeleteRequest {
    ids: string[]
}

interface ChangeRecord {
    from: any
    to: any
}

interface Changes {
    [key: string]: ChangeRecord
}

const listallContacts = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit

        const sortBy = (req.query.sortBy as string) || 'createdAt'
        const order: 1 | -1 = req.query.order === 'asc' ? 1 : -1

        const search = req.query.search as string

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const userId = user._id as mongoose.Types.ObjectId
        let query: ContactQuery = { createdBy: userId }

        if (req.query.tag) {
            if (!mongoose.Types.ObjectId.isValid(req.query.tag as string)) {
                res.status(400).json({ error: 'Invalid tag ID' })
                return
            }
            query.tags = req.query.tag as string
        } else if (req.query.tags) {
            const rawTagIds = (req.query.tags as string).split(',')
            const allAreValid = rawTagIds.every(id => mongoose.Types.ObjectId.isValid(id))
            if (!allAreValid) {
                res.status(400).json({ error: 'One or more tag IDs are invalid' })
                return
            }
            const matchType = (req.query.matchType as string) || 'any'
            query.tags = matchType === 'all' ? { $all: rawTagIds } : { $in: rawTagIds }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }

        const contacts = await ContactModel.find(query)
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit)
            .populate('tags')
            .populate('company')

        const total = await ContactModel.countDocuments(query)

        res.status(200).json({ contacts, total, page, limit })
    } catch (error) {
        console.error('Error fetching contacts:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const createNewContact = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() })
            return
        }

        const { name, email, phone, company, notes, tags }: ContactData = req.body

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const userId = user._id as mongoose.Types.ObjectId

        const existingContact = await ContactModel.findOne({ email, createdBy: userId })
        if (existingContact) {
            res.status(409).json({ error: 'Contact with this email already exists.' })
            return
        }

        let existingCompanyid: mongoose.Types.ObjectId | null = null
        if (company) {
            let existingCompany = await CompanyModel.findOne({ name: company, createdBy: userId })
            if (!existingCompany) {
                existingCompany = await new CompanyModel({
                    name: company,
                    createdBy: userId,
                    usageCount: 1
                }).save()
            }
            existingCompanyid = existingCompany._id as mongoose.Types.ObjectId
        }

        if (tags?.length) {
            const validTags = await TagModel.find({ _id: { $in: tags } })
            if (validTags.length !== tags.length) {
                res.status(400).json({ error: 'One or more tag IDs are invalid.' })
                return
            }
            await TagModel.updateMany({ _id: { $in: tags } }, { $inc: { usageCount: 1 } })
        }

        const newContact = await new ContactModel({
            name,
            email,
            phone,
            company: existingCompanyid,
            notes,
            tags,
            createdBy: userId
        }).save()

        await newContact.populate('tags')

        res.status(201).json({ newContact, message: 'Contact created successfully' })
    } catch (error) {
        console.error('Error creating contact:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getContactById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const contactId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            res.status(400).json({ error: 'Invalid contact ID' })
            return
        }

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const contact = await ContactModel.findOne({
            _id: contactId,
            createdBy: user._id
        }).populate('tags').populate('company')

        if (!contact) {
            res.status(404).json({ error: 'Contact not found' })
            return
        }

        res.status(200).json(contact)
    } catch (error) {
        console.error('Error fetching contact by ID:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

const updateContactById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const contactId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            res.status(400).json({ error: 'Invalid contact ID' })
            return
        }

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const contact = await ContactModel.findOne({ _id: contactId, createdBy: user._id })
        if (!contact) {
            res.status(404).json({ error: 'Contact not found' })
            return
        }

        const { name, email, phone, company, notes, tags }: ContactData = req.body
        const changes: Changes = {}

        for (const field of ['name', 'email', 'phone', 'company', 'notes'] as const) {
            if (req.body[field] !== undefined && req.body[field] !== contact[field]) {
                changes[field] = { from: contact[field], to: req.body[field] }
                contact[field] = req.body[field]
            }
        }

        if (tags) {
            const validTags = await TagModel.find({ _id: { $in: tags } })
            if (validTags.length !== tags.length) {
                res.status(400).json({ error: 'Invalid tag IDs' })
                return
            }

            const oldTags = contact.tags?.map((t: any) => t.toString()).sort()
            const newTags = tags.map(String).sort()

            if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
                const oldNames = (await TagModel.find({ _id: { $in: oldTags } })).map(t => t.name)
                const newNames = validTags.map(t => t.name)

                changes.tags = { from: oldNames, to: newNames }
                contact.tags = tags.map(id => new mongoose.Types.ObjectId(id))
            }
        }

        contact.updatedAt = new Date()
        contact.lastInteraction = new Date()

        await contact.save()
        await contact.populate('tags')

        if (Object.keys(changes).length > 0) {
            await ActivityModel.create({
                user: user._id,
                action: 'contact_updated',
                entityType: 'contact',
                entityId: contact._id,
                entityName: contact.name,
                details: { contactName: contact.name, changes }
            })
        }

        res.status(200).json({ message: 'Contact updated successfully', contact })
    } catch (error) {
        console.error('Error updating contact:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const deleteContactById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const contactId = req.params.id
        if (!mongoose.Types.ObjectId.isValid(contactId)) {
            res.status(400).json({ error: 'Invalid contact ID' })
            return
        }

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const contact = await ContactModel.findOneAndDelete({
            _id: contactId,
            createdBy: user._id
        })

        if (!contact) {
            res.status(404).json({ error: 'Contact not found' })
            return
        }

        res.status(200).json({ message: 'Contact deleted successfully' })
    } catch (error) {
        console.error('Error deleting contact:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

const bulkDeleteContacts = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const { ids }: BulkDeleteRequest = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Contact IDs array is required.' })
            return
        }

        const contacts = await ContactModel.find({ _id: { $in: ids }, createdBy: user._id })
        const foundIds = contacts.map(c => (c._id as mongoose.Types.ObjectId).toString())
        const unauthorized = ids.filter(id => !foundIds.includes(id))

        if (unauthorized.length > 0) {
            res.status(403).json({ error: 'Unauthorized contact IDs', unauthorized })
            return
        }

        const result = await ContactModel.deleteMany({ _id: { $in: ids }, createdBy: user._id })

        await ActivityModel.create({
            user: user._id,
            action: 'bulk_delete',
            entityType: 'contact',
            entityId: null,
            details: {
                count: contacts.length,
                names: contacts.map(c => c.name),
                ids
            }
        })

        res.status(200).json({ message: 'Bulk delete successful', deletedCount: result.deletedCount })
    } catch (error) {
        console.error('Error in bulk delete contacts:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

export {
    listallContacts,
    createNewContact,
    getContactById,
    updateContactById,
    deleteContactById,
    bulkDeleteContacts
}
