import { Request } from 'express'

export interface FirebaseUser {
    uid: string
    email: string
}

export interface RequestWithUser extends Request {
    user?: FirebaseUser
    file?: Express.Multer.File
}
