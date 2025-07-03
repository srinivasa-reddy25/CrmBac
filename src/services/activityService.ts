import ActivityModel from '../models/activity.model';

export interface LogActivityParams {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, any>;
}

export async function logActivity({
    userId,
    action,
    entityType,
    entityId,
    details = {},
}: LogActivityParams): Promise<void> {
    try {
        await ActivityModel.create({
            user: userId,
            action,
            entityType,
            entityId,
            details,
        });
    } catch (error: any) {
        console.error('Failed to log activity:', error.message);
        // Do not rethrow — logging failures shouldn't break main logic
    }
}
