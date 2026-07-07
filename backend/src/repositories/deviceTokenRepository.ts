import { pool } from '../config/database';
import { ResultSetHeader } from 'mysql2/promise';

export const deviceTokenRepository = {
    async upsertToken(
        userId: number,
        token: string,
        platform: string
    ): Promise<void> {
        try {
            await pool.execute<ResultSetHeader>(
                `INSERT INTO device_tokens (user_id, token, platform)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 user_id = VALUES(user_id), 
                 platform = VALUES(platform),
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, token, platform]
            );
        } catch (error) {
            console.error('[DeviceTokenRepository] Error upserting token:', error);
            throw error;
        }
    },

    async deleteToken(token: string): Promise<void> {
        await pool.execute<ResultSetHeader>(
            `DELETE FROM device_tokens WHERE token = ?`,
            [token]
        );
    }
};
