import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    message: string;
    status: 'sent' | 'delivered' | 'seen';
    createdAt: Date;
    updatedAt: Date;
}

export const messageRepository = {
    async createMessage(
        senderId: number,
        receiverId: number,
        message: string
    ): Promise<Message> {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO messages (sender_id, receiver_id, message, status) VALUES (?, ?, ?, 'sent')`,
            [senderId, receiverId, message]
        );
        
        return this.getMessageById(result.insertId) as Promise<Message>;
    },

    async getMessageById(id: number): Promise<Message | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT 
                id, 
                sender_id as senderId, 
                receiver_id as receiverId, 
                message, 
                status, 
                created_at as createdAt, 
                updated_at as updatedAt 
             FROM messages WHERE id = ?`,
            [id]
        );
        return (rows[0] as Message) || null;
    },

    async getConversationMessages(
        userId: number,
        cursor?: number,
        limit: number = 20
    ): Promise<Message[]> {
        let query = `
            SELECT 
                id, 
                sender_id as senderId, 
                receiver_id as receiverId, 
                message, 
                status, 
                created_at as createdAt, 
                updated_at as updatedAt
            FROM messages 
            WHERE (sender_id = ? OR receiver_id = ?)
        `;
        const params: any[] = [userId, userId];

        if (cursor) {
            query += ` AND id < ?`;
            params.push(cursor);
        }

        query += ` ORDER BY id DESC LIMIT ?`;
        params.push(limit);

        const [rows] = await pool.execute<RowDataPacket[]>(query, params);
        
        return rows as Message[];
    },

    async updateMessagesSeen(messageIds: number[], receiverId: number): Promise<void> {
        if (!messageIds.length) return;
        
        const placeholders = messageIds.map(() => '?').join(',');
        const query = `
            UPDATE messages 
            SET status = 'seen' 
            WHERE id IN (${placeholders}) 
            AND receiver_id = ? 
            AND status != 'seen'
        `;
        
        await pool.execute(query, [...messageIds, receiverId]);
    },

    async updateMessageStatus(messageId: number, status: 'sent' | 'delivered' | 'seen'): Promise<void> {
        await pool.execute(
            `UPDATE messages SET status = ? WHERE id = ? AND status != 'seen'`,
            [status, messageId]
        );
    }
};
