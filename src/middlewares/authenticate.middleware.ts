import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        id: string;
        email: string;
    };
}

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('No Authorization Header Found');
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            id: decodedToken.uid,
            email: decodedToken.email || ''
        };

        next(); // ✅ Let the request continue
    } catch (err) {
        console.log('Authentication Error:', err);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
