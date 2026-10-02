import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error';
import { SESSION_COOKIE, verifySessionToken } from '../modules/auth/auth.service';

/** Rejects requests without a valid session cookie; exposes the user as res.locals.user. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const user = typeof token === 'string' ? verifySessionToken(token) : null;
  if (!user) throw HttpError.unauthorized('Please sign in');

  res.locals.user = user;
  next();
};
