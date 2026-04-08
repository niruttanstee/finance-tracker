import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET!;
if (!SECRET) throw new Error('SESSION_SECRET environment variable is required');
const COOKIE_NAME = 'sessionId';
const SEPARATOR = '.';

export interface SessionCookie {
  id: string;
  signature: string;
}

/**
 * Sign a session ID with HMAC-SHA256.
 * Cookie value format: ${sessionId}.${hmacSignature}
 */
export function signSession(sessionId: string): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update(sessionId);
  const signature = hmac.digest('hex');
  return `${sessionId}${SEPARATOR}${signature}`;
}

/**
 * Verify the HMAC signature of a session cookie.
 * Returns the sessionId if valid, null if tampered.
 */
export function verifySessionCookie(cookie: string): string | null {
  const lastDot = cookie.lastIndexOf(SEPARATOR);
  if (lastDot === -1) return null;
  const sessionId = cookie.slice(0, lastDot);
  const providedSignature = cookie.slice(lastDot + 1);
  const hmac = createHmac('sha256', SECRET);
  hmac.update(sessionId);
  const expectedSignature = hmac.digest('hex');
  try {
    const a = Buffer.from(providedSignature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically random session ID (32 bytes hex).
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export { COOKIE_NAME };