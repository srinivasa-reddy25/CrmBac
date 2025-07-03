import { Request, Response } from 'express';
import mongoose from 'mongoose';

import TagModel from '../models/tag.model';
import ContactModel from '../models/contact.model';
import UserModel from '../models/user.model';
import { RequestWithUser } from '@/types/express';

export const getAllTags = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const tags = await TagModel.find({ createdBy: user._id });
        res.status(200).json({ tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
};

export const createNewTag = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const tagsData = Array.isArray(req.body.tags) ? req.body.tags : [req.body];

        if (tagsData.length === 0) {
            res.status(400).json({ error: 'No tags provided' });
            return;
        }

        const createdTags: any[] = [];
        const errors: any[] = [];

        for (const tagData of tagsData) {
            const { name, color } = tagData;

            if (!name || !color) {
                errors.push({ tag: tagData, error: 'Name and color are required' });
                continue;
            }

            const existingTag = await TagModel.findOne({ name, createdBy: user._id });
            if (existingTag) {
                errors.push({ tag: tagData, error: 'Tag with this name already exists' });
                continue;
            }

            const newTag = new TagModel({ name, color, createdBy: user._id });
            await newTag.save();
            createdTags.push(newTag);
        }

        const response: any = {
            message: `${createdTags.length} tag(s) created successfully`,
            tags: createdTags,
        };

        if (errors.length > 0) response.errors = errors;

        const statusCode =
            createdTags.length > 0 ? (errors.length > 0 ? 207 : 201) : 400;

        res.status(statusCode).json(response);
    } catch (error) {
        console.error('Error creating tag(s):', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getTagById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const tagId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            res.status(400).json({ error: 'Invalid tag ID' });
            return;
        }

        const tag = await TagModel.findOne({
            _id: tagId,
            createdBy: user._id,
        });

        if (!tag) {
            res.status(404).json({ error: 'Tag not found' });
            return;
        }

        res.status(200).json(tag);
    } catch (error) {
        console.error('Error fetching tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateTagById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const tagId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            res.status(400).json({ error: 'Invalid tag ID' });
            return;
        }

        const tag = await TagModel.findOne({
            _id: tagId,
            createdBy: user._id,
        });

        if (!tag) {
            res.status(404).json({ error: 'Tag not found' });
            return;
        }

        const { name, color } = req.body;
        tag.name = name || tag.name;
        tag.color = color || tag.color;
        tag.updatedAt = new Date();

        await tag.save();

        res.status(200).json({
            message: 'Tag updated successfully',
            tag,
        });
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteTagById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const tagId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            res.status(400).json({ error: 'Invalid tag ID' });
            return;
        }

        const contactsWithTag = await ContactModel.find({ tags: tagId });
        if (contactsWithTag.length > 0) {
            res.status(409).json({
                message: 'Cannot delete tag that is in use by contacts',
                contactCount: contactsWithTag.length,
            });
            return;
        }

        const tag = await TagModel.findOneAndDelete({
            _id: tagId,
            createdBy: user._id,
        });

        if (!tag) {
            res.status(404).json({ error: 'Tag not found' });
            return;
        }

        res.status(200).json({ message: 'Tag deleted successfully' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
