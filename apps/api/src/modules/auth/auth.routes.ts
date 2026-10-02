import { Router, type CookieOptions } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { requireAuth } from '../../middleware/require-auth';
import { SESSION_COOKIE, createSessionToken, verifyCredentials } from './auth.service';

const LoginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

// The browser reaches the API through the Next.js proxy (same origin), so Lax is enough.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function createAuthRouter() {
  const router = Router();

  // Brute-force protection for the only credential in the system.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: 'Too many login attempts, please try again later' } },
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = LoginBody.parse(req.body);
    const user = await verifyCredentials(email, password);
    // Same message for wrong email or password: don't help attackers enumerate.
    if (!user) throw HttpError.unauthorized('Invalid email or password');

    res.cookie(SESSION_COOKIE, createSessionToken(user), {
      ...cookieOptions,
      maxAge: env.SESSION_TTL_HOURS * 3600 * 1000,
    });
    res.json(user);
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (_req, res) => {
    res.json(res.locals.user);
  });

  return router;
}
