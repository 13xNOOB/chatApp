import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface User {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    timezone: string;
    created_at: Date;
    updated_at: Date;
}

export const userRepository = {
    async createUser(
        name: string,
        email: string,
        passwordHash: string,
        timezone: string
    ): Promise<User> {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO users (name, email, password_hash, timezone) VALUES (?, ?, ?, ?)`,
            [name, email, passwordHash, timezone]
        );
        return this.findUserById(result.insertId) as Promise<User>;
    },

    async findUserByEmail(email: string): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM users WHERE email = ?`,
            [email]
        );
        return (rows[0] as User) || null;
    },

    async findUserById(id: number): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM users WHERE id = ?`,
            [id]
        );
        return (rows[0] as User) || null;
    },

    async getAllUsersExcept(id: number): Promise<(Omit<User, 'password_hash'> & { unreadCount: number })[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT 
                u.id, u.name, u.email, u.timezone, u.created_at, u.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.receiver_id = ? AND m.status != 'seen') as unreadCount
             FROM users u 
             WHERE u.id != ?`,
            [id, id]
        );
        return rows as (Omit<User, 'password_hash'> & { unreadCount: number })[];
    }
};
