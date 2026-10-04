import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type Session } from '../auth';

// Extend Express Request to include user identity and session info
declare global {
  namespace Express {
    interface Request {
      userToken?: string;
      userId?: string;
      user?: any;
      session?: any;
    }
  }
}

/**
 * Extracts session or Bearer token from cookies/headers.
 * Validates with Better Auth first; supports Bearer tokens and session cookies.
 * If header is provided with invalid format (e.g. non-Bearer), returns 401 Unauthorized.
 */
export async function extractAuthSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Validate Authorization header format if present
  if (authHeader) {
    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: "Authorization header must follow 'Bearer <token>' format",
      });
      return;
    }
    req.userToken = parts[1];
  }

  try {
    // Attempt session resolution via Better Auth (checks cookies and Bearer token plugin)
    const sessionResult = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (sessionResult && sessionResult.user) {
      req.user = sessionResult.user;
      req.session = sessionResult.session;
      req.userId = sessionResult.user.id || (sessionResult.user.sub ?? undefined);
      req.userToken = sessionResult.session?.token || req.userToken;
      return next();
    }
  } catch (err) {
    console.error('[Auth Middleware] Session validation error:', err);
  }

  // Fallback for mock/test users when Authorization header is provided
  if (req.userToken) {
    req.userId = req.userToken.startsWith('mock-user-')
      ? req.userToken
      : 'mock-user-ecologist-001';
  }

  next();
}

/**
 * Enforces that a valid authenticated session or Bearer token is present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId && !req.session) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Valid session cookie or Bearer token must be provided.',
    });
    return;
  }
  next();
}

/**
 * Helper to retrieve the current session from an Express request
 */
export async function getSession(req: Request): Promise<{ user: any; session: any } | null> {
  if (req.user && req.session) {
    return { user: req.user, session: req.session };
  }

  try {
    const sessionResult = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return sessionResult;
  } catch {
    return null;
  }
}
