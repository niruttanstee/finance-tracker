const SECRET = process.env.SESSION_SECRET!;
if (!SECRET) throw new Error('SESSION_SECRET environment variable is required');
const COOKIE_NAME = 'sessionId';
const SEPARATOR = '.';

// Edge-compatible crypto using Web Crypto API
let secretKey: CryptoKey | null = null;

async function getSecretKey(): Promise<CryptoKey> {
  if (secretKey) return secretKey;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET);
  secretKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return secretKey;
}

export interface SessionCookie {
  id: string;
  signature: string;
}

/**
 * Sign a session ID with HMAC-SHA256.
 * Cookie value format: ${sessionId}.${hmacSignature}
 */
export async function signSession(sessionId: string): Promise<string> {
  const key = await getSecretKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionId);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${sessionId}${SEPARATOR}${signatureHex}`;
}

/**
 * Verify the HMAC signature of a session cookie.
 * Returns the sessionId if valid, null if tampered.
 */
export async function verifySessionCookie(cookie: string): Promise<string | null> {
  const lastDot = cookie.lastIndexOf(SEPARATOR);
  if (lastDot === -1) return null;
  const sessionId = cookie.slice(0, lastDot);
  const providedSignature = cookie.slice(lastDot + 1);

  const key = await getSecretKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionId);

  let signatureBuffer: ArrayBuffer;
  try {
    signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  } catch {
    return null;
  }

  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe comparison
  if (providedSignature.length !== expectedHex.length) return null;
  let result = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    result |= providedSignature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  if (result !== 0) return null;

  return sessionId;
}

/**
 * Generate a cryptographically random session ID (32 bytes hex).
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export { COOKIE_NAME };