// backend/middleware/supabaseAuth.js
import { supabase } from '../supabaseAdmin.js';

export default async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Invalid Authorization header' });

    // Verify token and retrieve user
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('Auth middleware error', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}
