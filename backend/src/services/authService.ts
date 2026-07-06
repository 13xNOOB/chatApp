import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository, User } from '../repositories/userRepository';
import { deviceTokenRepository } from '../repositories/deviceTokenRepository';

const SALT_ROUNDS = 10;

export const authService = {
    async register(name: string, email: string, passwordPlain: string, timezone: string) {
        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            const error: any = new Error('Email already in use');
            error.status = 409;
            error.code = 'EMAIL_EXISTS';
            throw error;
        }

        const passwordHash = await bcrypt.hash(passwordPlain, SALT_ROUNDS);
        const newUser = await userRepository.createUser(name, email, passwordHash, timezone);
        
        return this.sanitizeUser(newUser);
    },

    async login(email: string, passwordPlain: string, deviceToken?: string, platform?: string) {
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            const error: any = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        const isMatch = await bcrypt.compare(passwordPlain, user.password_hash);
        if (!isMatch) {
            const error: any = new Error('Invalid credentials');
            error.status = 401;
            error.code = 'UNAUTHORIZED';
            throw error;
        }

        if (deviceToken && platform) {
            await deviceTokenRepository.upsertToken(user.id, deviceToken, platform);
        }

        const token = this.generateToken(user.id);
        
        return {
            token,
            user: this.sanitizeUser(user)
        };
    },

    async logout(deviceToken?: string) {
        if (deviceToken) {
            await deviceTokenRepository.deleteToken(deviceToken);
        }
    },

    generateToken(userId: number): string {
        const secret = process.env.JWT_SECRET || 'secret';
        return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
    },

    sanitizeUser(user: User) {
        const { password_hash, ...sanitized } = user;
        return {
            id: sanitized.id,
            name: sanitized.name,
            email: sanitized.email,
            timezone: sanitized.timezone,
            createdAt: sanitized.created_at
        };
    }
};
