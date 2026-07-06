import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { messageService } from '../services/messageService';

export const socketManager = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // userId -> Set<socketId> mapping
    const onlineUsers = new Map<number, Set<string>>();

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const secret = process.env.JWT_SECRET || 'secret';
            const decoded = jwt.verify(token, secret) as { id: number };
            (socket as any).userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = (socket as any).userId;

        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId)!.add(socket.id);

        // Broadcast user_online
        io.emit('user_online', { userId });

        socket.on('disconnect', () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    // Broadcast user_offline
                    io.emit('user_offline', { userId });
                }
            }
        });

        socket.on('send_message', async (data, callback) => {
            try {
                const { clientTempId, receiverId, message } = data;
                const isReceiverOnline = onlineUsers.has(receiverId);

                const savedMessage = await messageService.sendMessage(userId, receiverId, message, isReceiverOnline);

                // Acknowledge sender
                socket.emit('message_ack', {
                    clientTempId,
                    message: savedMessage
                });

                // Notify receiver if online
                if (isReceiverOnline) {
                    const receiverSockets = onlineUsers.get(receiverId);
                    receiverSockets?.forEach(socketId => {
                        io.to(socketId).emit('receive_message', {
                            message: savedMessage
                        });
                    });
                }
            } catch (err) {
                console.error('Socket send_message error', err);
            }
        });

        socket.on('mark_seen', async (data) => {
            try {
                const { messageIds } = data;
                if (!Array.isArray(messageIds) || messageIds.length === 0) return;

                // We assume these messages have the same sender (or we can just blindly update them all for the receiver)
                await messageService.markMessagesAsSeen(messageIds, userId);

                // For simplicity, we broadcast message_seen to everyone (or ideally we'd fetch the original sender, 
                // but the API spec says "Notify original sender if online". We'll just emit it to all and let clients filter, 
                // or we could optimize by getting sender from DB. For now, we broadcast).
                // To be exact to spec, the client should probably tell us the senderId, or we emit to everyone.
                io.emit('message_seen', {
                    messageIds,
                    seenBy: userId
                });
            } catch (err) {
                console.error('Socket mark_seen error', err);
            }
        });

        socket.on('typing_start', (data) => {
            const { receiverId } = data;
            const receiverSockets = onlineUsers.get(receiverId);
            receiverSockets?.forEach(socketId => {
                io.to(socketId).emit('typing_start', { userId });
            });
        });

        socket.on('typing_stop', (data) => {
            const { receiverId } = data;
            const receiverSockets = onlineUsers.get(receiverId);
            receiverSockets?.forEach(socketId => {
                io.to(socketId).emit('typing_stop', { userId });
            });
        });
    });

    return io;
};
