import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';

import { saveMessage } from '../services/chatService';
import { processWithAI } from '../services/aiService';
import ChatMessageModel from '../models/chatMessage.model';
import ConversationModel from '../models/conversation.model';

import { socketAuthMiddleware } from '../middlewares/socketAuth.middleware';
import { Types } from 'mongoose';

dotenv.config();

interface ClearConversationPayload {
    userId: string;
    conversationId: string;
}

interface SendMessagePayload {
    message: string;
    conversationId: string;
}

interface SocketWithUser extends Socket {
    user: {
        uid: string;
        email: string;
        name?: string;
        picture?: string;
    };
}

async function handleClearConversation(socket: SocketWithUser, { userId, conversationId }: ClearConversationPayload) {
    try {
        if (!userId || !conversationId) {
            return socket.emit('clear-conversation-error', 'Missing userId or conversationId');
        }

        await ChatMessageModel.deleteMany({ user: userId, conversationId });
        await ConversationModel.findByIdAndUpdate(conversationId, { isArchived: true });

        socket.emit('conversation-cleared', { conversationId });
    } catch (error: any) {
        console.error('❌ Error clearing conversation:', error.message);
        socket.emit('clear-conversation-error', 'Failed to clear conversation');
    }
}

async function handleGetChatHistory(
    socket: SocketWithUser,
    userId: string,
    conversationId: string,
    page: number = 1,
    limit: number = 20
) {
    try {
        if (!userId || !conversationId) return;

        const messages = await ChatMessageModel.find({
            user: userId,
            conversationId
        })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        socket.emit('chat-history', messages.reverse());
    } catch (error: any) {
        console.error('Failed to fetch chat history:', error.message);
        socket.emit('chat-history-error', 'Unable to load messages.');
    }
}

function setupSocketIO(server: HttpServer, options = {}) {
    const io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_IO_CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        ...options,
    });

    console.log('✅ Socket.IO setup complete');

    io.use(socketAuthMiddleware);

    io.on('connection', (socket: Socket) => {
        // Type assertion after middleware has run
        const authenticatedSocket = socket as SocketWithUser;
        const { uid } = authenticatedSocket.user;
        console.log(`🧠 New socket connection established: ${socket.id}`);

        authenticatedSocket.on('join-chat', () => {
            authenticatedSocket.join(`chat-${uid}`);
            console.log(`✅ ${uid} joined chat-${uid}`);
        });

        authenticatedSocket.on('get-chat-history', ({ conversationId }: { conversationId: string }) => {
            handleGetChatHistory(authenticatedSocket, uid, conversationId);
        });

        authenticatedSocket.on('clear-conversation', (payload: ClearConversationPayload) => {
            handleClearConversation(authenticatedSocket, payload);
        });

        authenticatedSocket.on('send-message', async (data: SendMessagePayload) => {
            const { message, conversationId } = data;
            const userId = uid;

            try {
                if (!userId || !message?.trim()) return;

                const userMsg = await saveMessage(userId, message, 'user', conversationId);

                let conversationIdForAI = conversationId;
                if (conversationId === 'new') {
                    conversationIdForAI = userMsg.conversationId.toString();
                }

                authenticatedSocket.emit('ai-typing', true);

                const aiResponse = await processWithAI(message, userId, conversationIdForAI);

                const aiMsg = await saveMessage(userId, aiResponse, 'ai', conversationIdForAI);

                authenticatedSocket.emit('ai-typing', false);
                authenticatedSocket.emit('new-message', aiMsg);
            } catch (error: any) {
                console.error('❌ Error processing message:', error.message);
                authenticatedSocket.emit('error-message', 'Something went wrong. Please try again.');
            }
        });

        authenticatedSocket.on('disconnect', () => {
            console.log(`👋 Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

export default setupSocketIO;
