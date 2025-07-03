import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'

// Define upload directory from env or fallback
const uploadDir = process.env.UPLOAD_DIR || 'uploads/temp'

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`
        cb(null, uniqueName)
    }
})

// File filter to allow only .csv files
function csvFileFilter(
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== '.csv') {
        return cb(new Error('Only .csv files are allowed'))
    }
    cb(null, true)
}

// Create multer upload instance
const upload = multer({
    storage,
    fileFilter: csvFileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB
    }
})

export default upload
