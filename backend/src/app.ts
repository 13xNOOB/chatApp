import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy' } });
});

// Register central error handler
app.use(errorHandler);

export default app;
