console.log("database.ts file is executed")

import mongoose from 'mongoose'

const MONGO_URL: string = process.env.MONGODB_URL || ''

if (!MONGO_URL) {
    throw new Error("DB URL is not defined in environment variables")
}

const connectToDataBase = async (): Promise<void> => {
    console.log("Connecting to Database.........")
    try {
        await mongoose.connect(MONGO_URL)
        console.log("Connected to Database successfully")
    } catch (err) {
        console.error("Database connection error:", err)
    }
}

export default connectToDataBase
