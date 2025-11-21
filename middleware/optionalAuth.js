// optionalAuth.js - Middleware that allows both authenticated and anonymous users
const jwt = require('jsonwebtoken');

const optionalAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (token) {
      try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        // Set user information in request object if token is valid
        req.user = decoded.user;
        req.isAuthenticated = true;
      } catch (error) {
        // Invalid token, but continue as anonymous user
        req.isAuthenticated = false;
        req.user = null;
      }
    } else {
      // No token provided, continue as anonymous user
      req.isAuthenticated = false;
      req.user = null;
    }

    // Get or generate sessionId for anonymous users
    if (!req.isAuthenticated) {
      // Check if sessionId is provided in headers or body
      req.sessionId = req.headers['x-session-id'] || req.body.sessionId || null;
      
      // If no sessionId provided, we'll generate one in the controller
      // This allows clients to generate their own session IDs
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Even on error, continue as anonymous user
    req.isAuthenticated = false;
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;

