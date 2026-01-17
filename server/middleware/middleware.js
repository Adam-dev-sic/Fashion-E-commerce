// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "super-secret-key-change-this";

export const authenticateToken = (req, res, next) => {
  // 1. Read the token from the cookie
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // 2. Verify the token
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Attach user info (id, email) to the request object
    next(); // Pass control to the next handler
  } catch (error) {
    res.clearCookie("token"); // Invalid token? Clear the cookie
    return res.status(403).json({ error: "Invalid token." });
  }
};