import mongoose, { Schema, Document, Model } from 'mongoose'
import { User } from '../types/user'


export interface UserDocument extends User, Document {
    updateLastLogin(): Promise<UserDocument>
}


const UserSchema: Schema<UserDocument> = new Schema(
    {
        firebaseUID: { type: String, required: true, unique: true },
        displayName: { type: String },
        email: { type: String, unique: true },
        profilePicture: { type: String },
        preference: { type: String },
        lastLogin: { type: Date, default: Date.now },
    },
    { timestamps: true }
)


UserSchema.methods.updateLastLogin = function (): Promise<UserDocument> {
    this.lastLogin = new Date()
    return this.save()
}


const UserModel: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)

export default UserModel
