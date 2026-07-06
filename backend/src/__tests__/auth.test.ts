import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';

jest.mock('../config/database', () => ({
    pool: {
        execute: jest.fn()
    }
}));

describe('Auth API', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            (pool.execute as jest.Mock)
                .mockResolvedValueOnce([[]]) // No existing user
                .mockResolvedValueOnce([{ insertId: 1 }]) // Insert user
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    name: 'John Doe', 
                    email: 'john@example.com', 
                    timezone: 'Asia/Dhaka', 
                    created_at: new Date() 
                }]]); // Find created user

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    timezone: 'Asia/Dhaka'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.name).toBe('John Doe');
            expect(res.body.data.user.password_hash).toBeUndefined();
        });

        it('should fail with invalid timezone', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    timezone: 'Invalid/Timezone'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const hash = await bcrypt.hash('password123', 10);
            
            (pool.execute as jest.Mock)
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    name: 'John Doe', 
                    email: 'john@example.com', 
                    password_hash: hash,
                    timezone: 'Asia/Dhaka' 
                }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.id).toBe(1);
        });

        it('should fail with incorrect password', async () => {
            const hash = await bcrypt.hash('password123', 10);
            
            (pool.execute as jest.Mock)
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    email: 'john@example.com', 
                    password_hash: hash 
                }]]);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        });
    });
});
