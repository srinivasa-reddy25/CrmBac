import express, { Response } from 'express'
import {authenticate} from '../middlewares/authenticate.middleware'
import UserModel from '../models/user.model'
import Activity from '../models/activity.model'
import { RequestWithUser } from '../types/express'

const router = express.Router()

// @route   POST /auth/register
const registerFunction = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { uid, email } = req.user!
    const { name, profilePicture, preference } = req.body

    const existingUser = await UserModel.findOne({ email })
    if (existingUser) {
        res.status(409).json({ error: 'User already exists' })
        return
    }

    const user = new UserModel({
        firebaseUID: uid,
        displayName: name,
        email,
        profilePicture,
        preference,
    })

    const saveUser = await user.save()

    res.status(200).json({
        message: 'User registered successfully',
        saveUser,
    })
}

// @route   POST /auth/login
const loginFunction = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { uid } = req.user!

    try {
        const user = await UserModel.findOne({ firebaseUID: uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        await Activity.create({
            user: user._id,
            action: 'user_login',
            entityType: 'user',
            entityId: user._id,
            entityName: user.displayName || user.email,
            details: { email: user.email },
        })

        res.status(200).json({ message: 'Login successful', user })
    } catch (err) {
        res.status(500).json({ error: 'Login failed' })
    }
}

// @route   POST /auth/google
const handleGoogleAuth = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { uid, email } = req.user!
    const { name, profilePicture } = req.body

    try {
        let user = await UserModel.findOne({ firebaseUID: uid })

        if (!user) {
            user = new UserModel({
                firebaseUID: uid,
                displayName: name,
                email,
                profilePicture,
                preference: 'light',
            })

            await user.save()

            await Activity.create({
                user: user._id,
                action: 'user_register',
                entityType: 'user',
                entityId: user._id,
                entityName: user.displayName || user.email,
                details: { email: user.email },
            })

            res.status(201).json({ message: 'Google user registered', user, isNewUser: true })
            return
        }

        await Activity.create({
            user: user._id,
            action: 'user_login',
            entityType: 'user',
            entityId: user._id,
            entityName: user.displayName || user.email,
            details: { email: user.email },
        })

        res.status(200).json({ message: 'Google login successful', user, isNewUser: false })
    } catch (err) {
        res.status(500).json({ error: 'Google authentication failed' })
    }
}

// @route   GET /auth/profile
const getProfileFunction = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { uid } = req.user!

    try {
        const user = await UserModel.findOne({ firebaseUID: uid })
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        res.status(200).json({ user })
    } catch (err) {
        res.status(500).json({ error: 'Database error' })
    }
}

// @route   PUT /auth/profile
const updateProfileFunction = async (req: RequestWithUser, res: Response): Promise<void> => {
    const { uid } = req.user!
    const { displayName, profilePicture } = req.body

    try {
        const updatedUser = await UserModel.findOneAndUpdate(
            { firebaseUID: uid },
            { displayName, profilePicture },
            { new: true }
        )

        if (!updatedUser) {
            res.status(404).json({ error: 'User not found' })
            return
        }

        res.status(200).json({
            message: 'User profile updated',
            updatedUser,
        })
    } catch (err) {
        res.status(500).json({ error: 'Update failed' })
    }
}

// Define routes
router.post('/auth/register', authenticate, registerFunction)
router.post('/auth/login', authenticate, loginFunction)
router.post('/auth/google', authenticate, handleGoogleAuth)
router.get('/auth/profile', authenticate, getProfileFunction)
router.put('/auth/profile', authenticate, updateProfileFunction)

export default router
