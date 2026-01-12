import type { DoubleCsrfUtilities } from 'csrf-csrf';
import { doubleCsrf } from 'csrf-csrf';
import { getEnv } from '@booth-buddy/shared';
import type { Request, Response, NextFunction } from 'express';

const env = getEnv();

const csrfUtilities: DoubleCsrfUtilities = doubleCsrf({
  getSecret: () => env.SESSION_SECRET,
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax', // 'lax' is needed for Shopify embedded apps in iframes
    secure: env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req: Request) => {
    // Get token from header (for AJAX requests)
    const headerToken = req.headers['x-csrf-token'];
    if (typeof headerToken === 'string') {
      return headerToken;
    }
    // Fallback to body for form submissions
    if (req.body && typeof req.body._csrf === 'string') {
      return req.body._csrf;
    }
    return null;
  },
});

const { generateToken, doubleCsrfProtection } = csrfUtilities;

// Middleware to generate and attach CSRF token to response locals
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = generateToken(req, res);
  res.locals.csrfToken = token;
  next();
}

// Middleware to validate CSRF token on state-changing requests
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
}

export { generateToken, doubleCsrfProtection };
