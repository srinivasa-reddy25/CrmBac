import { Response } from 'express'
import mongoose from 'mongoose'
import Activity from '../models/activity.model'
import User from '../models/user.model'
import { RequestWithUser } from '../types/express'



export const getActivities = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const firebaseUID = req.user?.uid

        if (!firebaseUID) {
            res.status(401).json({ error: 'Unauthorized: No user found in request.' })
            return
        }

        const user = await User.findOne({ firebaseUID })

        if (!user) {
            res.status(404).json({ error: 'User not found.' })
            return
        }

        const userId = user._id

        const {
            limit = '10',
            cursor,
            action,
            entityType,
            startDate,
            endDate,
        } = req.query

        const query: Record<string, any> = {
            user: userId
        }

        if (action) {
            query.action = action
        }

        if (entityType) {
            query.entityType = entityType
        }

        if (startDate || endDate) {
            query.timestamp = {}
            if (startDate) {
                query.timestamp.$gte = new Date(startDate as string)
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate as string)
            }
        }

        if (cursor && mongoose.Types.ObjectId.isValid(cursor.toString())) {
            query._id = { $lt: cursor }
        }

        const pageLimit = Math.min(parseInt(limit as string, 10), 100)

        const activities = await Activity.find(query)
            .sort({ _id: -1 })
            .limit(pageLimit + 1)
            .populate('user', 'name email')

        const hasMore = activities.length > pageLimit
        if (hasMore) {
            activities.pop()
        }

        const nextCursor = hasMore ? activities[activities.length - 1]._id : null

        res.status(200).json({
            activities,
            nextCursor,
            hasMore,
        })
    } catch (error) {
        console.error('Error fetching activities:', error)
        res.status(500).json({ error: 'Server error' })
    }
}
