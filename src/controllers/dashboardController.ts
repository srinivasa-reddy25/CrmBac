// Import your models
import ContactModel from '../models/contact.model';
import ActivityModel from '../models/activity.model';
import TagModel from '../models/tag.model';
import CompanyModel from '../models/company.model';
import UserModel from '../models/user.model';

import { Request, Response } from 'express';
import { RequestWithUser } from '@/types/express';

export const getSummaryMetrics = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);

        const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return
        }

        const userId = user._id;

        const totalContacts = await ContactModel.countDocuments({ createdBy: userId });
        const newContactsThisWeek = await ContactModel.countDocuments({
            createdBy: userId,
            createdAt: { $gte: lastWeek, $lte: new Date() },
        });
        const totalActivities = await ActivityModel.countDocuments({ user: userId });

        const tagAggregation = await ContactModel.aggregate([
            { $match: { createdBy: userId } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags' } },
            { $count: 'uniqueTags' },
        ]);

        const activeTags = tagAggregation[0]?.uniqueTags || 0;

        const lastWeekStats = {
            totalContacts: 1100,
            newContacts: 41,
            totalActivities: 10,
            activeTags: 1,
        };

        const getTrend = (current: number, previous: number): number =>
            previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);

        res.json({
            totalContacts: {
                value: totalContacts,
                trend: getTrend(totalContacts, lastWeekStats.totalContacts),
            },
            newContactsThisWeek: {
                value: newContactsThisWeek,
                trend: getTrend(newContactsThisWeek, lastWeekStats.newContacts),
            },
            totalActivities: {
                value: totalActivities,
                trend: getTrend(totalActivities, lastWeekStats.totalActivities),
            },
            activeTags: {
                value: activeTags,
                trend: getTrend(activeTags, lastWeekStats.activeTags),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getContactByCompany = async (req: RequestWithUser, res: Response): Promise<void> => {
    const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return
    }
    const userId = user._id;
    try {
        const result = await ContactModel.aggregate([
            { $match: { createdBy: userId } },
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'companies',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'companyDetails',
                },
            },
            { $unwind: { path: '$companyDetails', preserveNullAndEmptyArrays: true } },
            { $project: { name: { $ifNull: ['$companyDetails.name', 'Unknown'] }, count: 1 } },
        ]);

        res.json(result);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const activitiesTimeline = async (req: RequestWithUser, res: Response): Promise<void> => {
    const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return
    }
    const userId = user._id;

    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const result = await ActivityModel.aggregate([
            {
                $match: {
                    user: userId,
                    timestamp: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%b %d', date: '$timestamp' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json(result.map((item) => ({ date: item._id, count: item.count })));
    } catch (error) {
        console.error('Error fetching activities timeline:', error);
        res.status(500).json({ error: 'Internal server error' });
        return
    }
};

export const tagDistribution = async (req: RequestWithUser, res: Response): Promise<void> => {
    const user = await UserModel.findOne({ firebaseUID: req.user?.uid });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return
    }
    const userId = user._id;
    try {
        const result = await ContactModel.aggregate([
            { $match: { createdBy: userId } },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'tags',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tagDetails',
                },
            },
            {
                $unwind: {
                    path: '$tagDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    name: { $ifNull: ['$tagDetails.name', 'Unknown'] },
                    value: '$count',
                },
            },
            { $sort: { value: -1 } },
        ]);

        res.json(result);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
