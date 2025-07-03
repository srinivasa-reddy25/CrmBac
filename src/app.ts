import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose';

dotenv.config();

import connectToDataBase from './config/db';
import setupSocketIO from './sockets/chatHandler';

// Route imports
import authRouters from './routes/auth.routes';
import contactRouters from './routes/contact.routes';
import CompanyRouter from './routes/company.routes';
import TagRouter from './routes/tag.routes';
import dashboardRouter from './routes/dashboard.routes';
import conversationRoutes from './routes/conversation.routes';
import activityRoutes from './routes/activity.routes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = setupSocketIO(server);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());

// Routes
app.use('/api', authRouters);
app.use('/api/contacts', contactRouters);
app.use('/api/companies', CompanyRouter);
app.use('/api/tags', TagRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/conversations', conversationRoutes);
app.use('/api/activities', activityRoutes);

// Test route
app.get('/', (req: Request, res: Response) => {
    res.send('CRM Backend API is running ✅');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Graceful shutdown...');
    try {
        io.close(() => console.log('✅ Socket.IO closed'));
        server.close(() => console.log('✅ HTTP server closed'));
        await mongoose.disconnect();
        console.log('✅ Database disconnected');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM. Exiting...');
    process.exit(0);
});

// Server start
const PORT = process.env.PORT || 8000;

server.listen(PORT, async () => {
    console.log(`🚀 Starting server on port ${PORT}...`);
    try {
        await connectToDataBase();
        console.log('✅ Connected to database');
        console.log(`🌐 Server running at http://localhost:${PORT}`);
    } catch (error) {
        console.error('❌ Failed to connect to database:', error);
        process.exit(1);
    }
});
