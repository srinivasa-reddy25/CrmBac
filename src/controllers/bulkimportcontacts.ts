import fs from 'fs';
import csv from 'csv-parser';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import ContactModel from '../models/contact.model';
import CompanyModel from '../models/company.model';
import TagModel from '../models/tag.model';
import ActivityModel from '../models/activity.model';
import UserModel from '../models/user.model';
import { RequestWithUser } from '@/types/express';

export const bulkImportContacts = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const filePath = req.file?.path;

        if (!filePath) {
            res.status(400).json({ error: 'CSV file not provided.' });
            return
        }

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return
        }

        const userId = new mongoose.Types.ObjectId(user._id as string); // ensure ObjectId type
        const seenEmails = new Set<string>();
        const contacts: any[] = [];
        const failed: { row: any; reason: string }[] = [];
        const batchSize = parseInt(process.env.CSV_BATCH_SIZE || '100');

        const fileStream = fs.createReadStream(filePath).pipe(csv());

        for await (const row of fileStream) {
            const { name, email, phone, company, notes, tags } = row;

            let existingCompanyId: mongoose.Types.ObjectId | null = null;

            if (company) {
                let existingCompany = await CompanyModel.findOne({ name: company, createdBy: userId });
                if (!existingCompany) {
                    existingCompany = await new CompanyModel({
                        name: company,
                        createdBy: userId,
                    }).save();
                }

                // fix _id typing
                existingCompanyId =
                    existingCompany._id instanceof mongoose.Types.ObjectId
                        ? existingCompany._id
                        : new mongoose.Types.ObjectId(existingCompany._id as string);
            }

            let tagIds: mongoose.Types.ObjectId[] = [];
            if (tags) {
                const tagNames = tags.split(';').map((t: string) => t.trim());
                tagIds = await Promise.all(
                    tagNames.map(async (tagName: string) => {
                        let tag = await TagModel.findOne({ name: tagName, createdBy: userId });
                        if (!tag) {
                            tag = await new TagModel({ name: tagName, createdBy: userId }).save();
                        }

                        return tag._id instanceof mongoose.Types.ObjectId
                            ? tag._id
                            : new mongoose.Types.ObjectId(tag._id as string);
                    })
                );
            }

            if (!name || !email) {
                failed.push({ row, reason: 'Missing required fields' });
                continue;
            }

            if (seenEmails.has(email)) {
                failed.push({ row, reason: 'Duplicate email in CSV batch' });
                continue;
            }

            const existing = await ContactModel.findOne({ email, createdBy: userId });
            if (existing) {
                failed.push({ row, reason: 'Duplicate email in DB' });
                continue;
            }

            seenEmails.add(email);

            contacts.push({
                name,
                email,
                tags: tagIds,
                phone,
                company: existingCompanyId,
                notes,
                createdBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            if (contacts.length >= batchSize) {
                await ContactModel.insertMany(contacts);
                contacts.length = 0;
            }
        }

        if (contacts.length > 0) {
            await ContactModel.insertMany(contacts);
        }

        fs.unlinkSync(filePath);

        try {
            await ActivityModel.create({
                user: userId,
                action: 'bulk_import',
                entityType: 'contact',
                entityId: null,
                details: {
                    successCount: contacts.length,
                    failureCount: failed.length,
                    failedReasons: failed.map(f => ({
                        email: f.row.email,
                        reason: f.reason,
                    })),
                },
            });
        } catch (logError) {
            console.error('Activity logging failed for bulk import:', logError);
        }

        res.status(200).json({
            message: 'Import complete',
            successCount: contacts.length,
            failureCount: failed.length,
            failed,
        });
    } catch (error: any) {
        console.error('Error during bulk import:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
