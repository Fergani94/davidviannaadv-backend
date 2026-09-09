import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { verifyPassword, generateJWT } from '../services/auth';
import { ApiError } from '../middleware/errorHandler';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      const error: ApiError = new Error('Email and password are required');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Query user from Supabase
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      const error: ApiError = new Error('Invalid email or password');
      error.statusCode = 401;
      next(error);
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      const error: ApiError = new Error('Invalid email or password');
      error.statusCode = 401;
      next(error);
      return;
    }

    // Generate JWT token
    const token = generateJWT(user.id, user.email);

    res.json({
      token,
      expiresIn: 604800 // 7 days in seconds
    });
  } catch (error) {
    next(error);
  }
}
