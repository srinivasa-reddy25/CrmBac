import { Request, Response } from 'express'
import mongoose from 'mongoose'
// import { validationResult } from 'express-validator'
import Company from '../models/company.model'
import User from '../models/user.model'
import { RequestWithUser } from '../types/express'

// List all companies for the authenticated user
export const listAllCompanies = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const firebaseUID = req.user?.uid

        const user = await User.findOne({ firebaseUID })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const companies = await Company.find({ createdBy: user._id })
        res.status(200).json({ companies })
    } catch (error) {
        console.error('Error fetching companies:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Create a new company
export const createNewCompany = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        // const errors = validationResult(req)
        // if (!errors.isEmpty()) {
        //   res.status(400).json({ errors: errors.array() })
        //   return
        // }

        const { name, description, industry, website } = req.body
        const firebaseUID = req.user?.uid

        const user = await User.findOne({ firebaseUID })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        const existing = await Company.findOne({ name, createdBy: user._id })
        if (existing) {
            res.status(409).json({ error: 'Company with this name already exists.' })
            return
        }

        const newCompany = new Company({
            name,
            description,
            industry,
            website,
            createdBy: user._id,
        })

        await newCompany.save()

        res.status(201).json({
            message: 'Company created successfully',
            company: newCompany,
        })
    } catch (error) {
        console.error('Error creating company:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Get a single company by ID
export const getCompanyById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const companyId = req.params.id
        const firebaseUID = req.user?.uid

        const user = await User.findOne({ firebaseUID })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            res.status(400).json({ error: 'Invalid company ID' })
            return
        }

        const company = await Company.findOne({
            _id: companyId,
            createdBy: user._id,
        })

        if (!company) {
            res.status(404).json({ error: 'Company not found' })
            return
        }

        res.status(200).json(company)
    } catch (error) {
        console.error('Error fetching company:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Update a company by ID
export const updateCompanyById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const companyId = req.params.id
        const firebaseUID = req.user?.uid

        const user = await User.findOne({ firebaseUID })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            res.status(400).json({ error: 'Invalid company ID' })
            return
        }

        const company = await Company.findOne({
            _id: companyId,
            createdBy: user._id,
        })

        if (!company) {
            res.status(404).json({ error: 'Company not found' })
            return
        }

        const { name, description, industry, website } = req.body

        company.name = name || company.name
        company.description = description || company.description
        company.industry = industry || company.industry
        company.website = website || company.website
        company.updatedAt = new Date()

        await company.save()

        res.status(200).json({
            message: 'Company updated successfully',
            company,
        })
    } catch (error) {
        console.error('Error updating company:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Delete a company by ID
export const deleteCompanyById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const companyId = req.params.id
        const firebaseUID = req.user?.uid

        const user = await User.findOne({ firebaseUID })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            res.status(400).json({ error: 'Invalid company ID' })
            return
        }

        const company = await Company.findOneAndDelete({
            _id: companyId,
            createdBy: user._id,
        })

        if (!company) {
            res.status(404).json({ error: 'Company not found' })
            return
        }

        res.status(200).json({ message: 'Company deleted successfully' })
    } catch (error) {
        console.error('Error deleting company:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
