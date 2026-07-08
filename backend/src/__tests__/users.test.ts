import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';
import jwt from 'jsonwebtoken';

jest.mock('../config/database', () => ({
    pool: {
        execute: jest.fn()
    }
}));

describe('Users API', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const generateTestToken = (userId: number) => {
        const secret = process.env.JWT_SECRET || 'secret';
        return jwt.sign({ id: userId }, secret);
    };

    describe('GET /api/users', () => {
        it('should return 401 if no token provided', async () => {
            const res = await request(app).get('/api/users');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should return users excluding the current authenticated user', async () => {
            const token = generateTestToken(1);
            
            (pool.execute as jest.Mock).mockResolvedValueOnce([
                [
                    { id: 2, name: 'Jane Advisor', email: 'jane@example.com', timezone: 'America/New_York' }
                ]
            ]);

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.users).toHaveLength(1);
            expect(res.body.data.users[0].id).toBe(2);
            expect(pool.execute).toHaveBeenCalledWith(
                expect.stringContaining('id != ?'),
                [1, 1]
            );
        });
    });
});
