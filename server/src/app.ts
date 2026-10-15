import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
