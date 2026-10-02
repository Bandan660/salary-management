import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export const SESSION_COOKIE = 'session';

export interface SessionUser {
  email: string;
}

/**
 * Checks the single HR account. bcrypt runs even when the email is wrong so
 * response time doesn't reveal whether the email exists.
 */
export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const passwordOk = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
  const emailOk = email.trim().toLowerCase() === env.ADMIN_EMAIL;
  return passwordOk && emailOk ? { email: env.ADMIN_EMAIL } : null;
}

export function createSessionToken(user: SessionUser): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: user.email,
    expiresIn: env.SESSION_TTL_HOURS * 3600,
    algorithm: 'HS256',
  });
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && payload.sub ? { email: payload.sub } : null;
  } catch {
    return null; // expired, tampered or malformed
  }
}
