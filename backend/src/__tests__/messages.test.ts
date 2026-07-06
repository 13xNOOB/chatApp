import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
    pool: {
        execute: jest.fn()
    }
}));

describe('Messages API', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const generateTestToken = (userId: number) => {
        const secret = process.env.JWT_SECRET || 'secret';
        return jwt.sign({ id: userId }, secret);
    };

    describe('GET /api/messages/:userId', () => {
        it('should return 401 if no token provided', async () => {
            const res = await request(app).get('/api/messages/2');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should return messages history with cursor pagination shape', async () => {
            const token = generateTestToken(1);
            
            (pool.execute as jest.Mock).mockResolvedValueOnce([
                [
                    { 
                        id: 101, 
                        senderId: 1, 
                        receiverId: 2, 
                        message: 'Hello', 
                        status: 'sent', 
                        createdAt: new Date(), 
                        updatedAt: new Date() 
                    }
                ]
            ]);

            const res = await request(app)
                .get('/api/messages/2?limit=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.messages).toHaveLength(1);
            expect(res.body.data.messages[0].id).toBe(101);
            expect(res.body.data.pagination.limit).toBe(1);
            // Has more because returned messages length === limit
            expect(res.body.data.pagination.hasMore).toBe(true);
            expect(res.body.data.pagination.nextCursor).toBe(101);

            expect(pool.execute).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY id DESC LIMIT 1'),
                [1, 2, 2, 1] // [userId1, userId2, userId2, userId1]
            );
        });

        it('should correctly apply cursor filter when cursor is provided without OFFSET', async () => {
            const token = generateTestToken(1);
            
            (pool.execute as jest.Mock).mockResolvedValueOnce([[]]);

            const res = await request(app)
                .get('/api/messages/2?cursor=101&limit=20')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            
            expect(pool.execute).toHaveBeenCalledWith(
                expect.stringContaining('AND id < ?'),
                [1, 2, 2, 1, 101]
            );
            expect(pool.execute).not.toHaveBeenCalledWith(
                expect.stringContaining('OFFSET'),
                expect.anything()
            );
        });
    });
});
