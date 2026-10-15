import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';
import { generateToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query<{
      id: string;
      email: string;
      name: string | null;
      created_at: string;
    }>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [cleanEmail, passwordHash, name || null]
    );

    const newUser = result.rows[0];
    const token = generateToken({ userId: newUser.id, email: newUser.email });

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      name: string | null;
    }>(
      `SELECT id, email, password_hash, name
       FROM users
       WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});
