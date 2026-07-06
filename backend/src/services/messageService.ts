import { messageRepository } from '../repositories/messageRepository';
import { userRepository } from '../repositories/userRepository';
import { pushNotificationService } from './pushNotificationService';

export const messageService = {
    async sendMessage(senderId: number, receiverId: number, messageText: string, isReceiverOnline: boolean) {
        if (!messageText || messageText.trim() === '') {
            throw new Error('Message cannot be empty');
        }

        const receiver = await userRepository.findUserById(receiverId);
        if (!receiver) {
            throw new Error('Receiver not found');
        }

        const message = await messageRepository.createMessage(senderId, receiverId, messageText);

        if (!isReceiverOnline) {
            const sender = await userRepository.findUserById(senderId);
            if (sender) {
                await pushNotificationService.sendPushNotification(receiverId, sender.name, messageText);
            }
        }

        return message;
    },

    async getHistory(userId: number, cursor?: number, limit: number = 20) {
        const messages = await messageRepository.getConversationMessages(userId, cursor, limit);
        
        let nextCursor = null;
        if (messages.length > 0 && messages.length === limit) {
            nextCursor = messages[messages.length - 1].id;
        }

        return {
            messages,
            pagination: {
                nextCursor,
                hasMore: nextCursor !== null,
                limit
            }
        };
    },

    async markMessagesAsSeen(messageIds: number[], receiverId: number) {
        await messageRepository.updateMessagesSeen(messageIds, receiverId);
    }
};
