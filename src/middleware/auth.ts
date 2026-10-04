import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include optional user identity info
declare global {
  namespace Express {
    interface Request {
      userToken?: string;
      userId?: string;
    }
  }
}

/**
 * Extracts Bearer token from Authorization header if present.
 * If header is provided with invalid format, returns 401 Unauthorized.
 */
export function extractAuthToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({
      error: 'Unauthorized',
      message: "Authorization header must follow 'Bearer <token>' format",
    });
    return;
  }

  req.userToken = parts[1];

  // If token corresponds to a user ID or mock token
  req.userId = req.userToken.startsWith('mock-user-')
    ? req.userToken
    : 'mock-user-ecologist-001';

  next();
}

/**
 * Enforces that a valid Bearer token is present on authenticated routes.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Bearer token must be provided in Authorization header.',
    });
    return;
  }
  next();
}
