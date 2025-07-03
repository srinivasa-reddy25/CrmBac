import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import admin from 'firebase-admin';
import UserModel from '../models/user.model';
import { Types } from 'mongoose';

interface AuthenticatedSocket extends Socket {
    user?: {
        uid: string;
        email: string;
        name?: string;
        picture?: string;
    };
}

export async function socketAuthMiddleware(
    socket: AuthenticatedSocket,
    next: (err?: ExtendedError | undefined) => void
): Promise<void> {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Firebase token missing'));
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await UserModel.findOne({ firebaseUID: decodedToken.uid });

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = {
            uid: (user._id as Types.ObjectId).toString(),
            email: decodedToken.email || '',
            name: decodedToken.name || '',
            picture: decodedToken.picture || '',
        };

        next();
    } catch (error: any) {
        console.error('Firebase token verification failed:', error.message);
        next(new Error('Unauthorized'));
    }
}
