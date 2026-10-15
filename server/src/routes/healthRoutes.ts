import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await query('SELECT 1 as healthy');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check database error:', err);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

healthRouter.get('/auth', authenticateToken, async (req, res) => {
  try {
    await query('SELECT 1 as healthy');
    res.status(200).json({
      status: 'authenticated',
      user: req.user,
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
