// =============================================================================
// DEWPORTAL FRONTEND - M2M AUTHENTICATION
// =============================================================================

import { SignJWT, importPKCS8 } from 'jose';
import { errorLog, debugLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface M2MTokenPayload {
  iss: string;
  iat: number;
  exp: number;
  jti: string;
  aud: string;
  [key: string]: unknown;
}

export interface M2MTokenResult {
  token: string;
  expiresAt: number;  
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const M2M_CONFIG = {
  ISSUER: 'nextjs-server',
  AUDIENCE: 'dewportal-django',
  TOKEN_LIFETIME: 300,
  ALGORITHM: 'RS256',
} as const;

// -----------------------------------------------------------------------------
// ✅ Global cache that persists across Next.js module reloads
// -----------------------------------------------------------------------------

const globalForM2M = global as typeof globalThis & {
  m2mPrivateKey: string | null;
  m2mCryptoKey: CryptoKey | null; // ⚡ NEW: Cache the parsed CryptoKey
  m2mTokenCache: M2MTokenResult | null;
};

if (!globalForM2M.m2mPrivateKey) globalForM2M.m2mPrivateKey = null;
if (!globalForM2M.m2mCryptoKey) globalForM2M.m2mCryptoKey = null;
if (!globalForM2M.m2mTokenCache) globalForM2M.m2mTokenCache = null;

// -----------------------------------------------------------------------------
// Load & Parse Private Key
// -----------------------------------------------------------------------------

export async function loadPrivateKey(): Promise<string> {
  if (globalForM2M.m2mPrivateKey) {
    return globalForM2M.m2mPrivateKey;
  }

  try {
    const privateKeyEnv = process.env.NEXTJS_PRIVATE_KEY;

    if (!privateKeyEnv) {
      throw new Error('Service configuration error');
    }

    const normalized = privateKeyEnv.replace(/\\n/g, '\n');

    if (
      !normalized.includes('-----BEGIN RSA PRIVATE KEY-----') &&
      !normalized.includes('-----BEGIN PRIVATE KEY-----')
    ) {
      throw new Error('Service configuration error');
    }

    globalForM2M.m2mPrivateKey = normalized;
    debugLog('Private key loaded successfully');
    return globalForM2M.m2mPrivateKey;

  } catch (error) {
    errorLog('Failed to load private key', error);
    throw new Error('Service is temporarily unavailable. Please try again later.');
  }
}

// ⚡ NEW: Parse PEM key to CryptoKey (cached for performance)
export async function getCryptoKey(): Promise<CryptoKey> {
  if (globalForM2M.m2mCryptoKey) {
    return globalForM2M.m2mCryptoKey;
  }

  const pem = await loadPrivateKey();
  
  // Parse PEM to CryptoKey using jose
  const cryptoKey = await importPKCS8(pem, M2M_CONFIG.ALGORITHM);
  
  globalForM2M.m2mCryptoKey = cryptoKey;
  return cryptoKey;
}

// -----------------------------------------------------------------------------
// Generate Token
// -----------------------------------------------------------------------------

export async function generateM2MToken(): Promise<string> {
  try {
    // Check cache with 60-second buffer
    if (globalForM2M.m2mTokenCache && globalForM2M.m2mTokenCache.expiresAt > Date.now() + 60000) {
      debugLog('Using cached M2M token');
      return globalForM2M.m2mTokenCache.token;
    }

    const systemApiKey = process.env.SYSTEM_API_KEY;
    if (!systemApiKey) {
      throw new Error('Service configuration error');
    }

    const jti = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + M2M_CONFIG.TOKEN_LIFETIME;

    const payload: M2MTokenPayload = {
      iss: M2M_CONFIG.ISSUER,
      iat: now,
      exp: exp,
      jti: jti,
      aud: M2M_CONFIG.AUDIENCE,
    };

    // ⚡ Get cached CryptoKey and sign with jose
    const cryptoKey = await getCryptoKey();
    
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: M2M_CONFIG.ALGORITHM }) // Required: explicit algorithm
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setJti(jti)
      .setIssuer(M2M_CONFIG.ISSUER)
      .setAudience(M2M_CONFIG.AUDIENCE)
      .sign(cryptoKey);

    // Update cache
    globalForM2M.m2mTokenCache = {
      token,
      expiresAt: exp * 1000,
    };

    debugLog('Token generated successfully', {
      jti,
      expiresAt: new Date(exp * 1000).toISOString(),
    });

    return token;

  } catch (error) {
    errorLog('Failed to generate token', error);
    throw new Error('Service is temporarily unavailable. Please try again later.');
  }
}

// -----------------------------------------------------------------------------
// Get Request Headers
// -----------------------------------------------------------------------------

export async function getM2MHeaders(): Promise<Record<string, string>> {
  try {
    const systemApiKey = process.env.SYSTEM_API_KEY;

    if (!systemApiKey) {
      throw new Error('Service configuration error');
    }

    const token = await generateM2MToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-System-API-Key': systemApiKey,
      'X-M2M-Authorization': `Bearer ${token}`,
    };

    debugLog('M2M headers generated', {
      apiKey: `${systemApiKey.substring(0, 8)}...`,
      tokenPrefix: `${token.substring(0, 20)}...`,
    });

    return headers;

  } catch (error) {
    errorLog('Failed to prepare request headers', error);
    throw new Error('Service is temporarily unavailable. Please try again later.');
  }
}

// -----------------------------------------------------------------------------
// Cache Management
// -----------------------------------------------------------------------------

export function clearTokenCache(): void {
  globalForM2M.m2mTokenCache = null;
  debugLog('Token cache cleared');
}

export function clearPrivateKeyCache(): void {
  globalForM2M.m2mPrivateKey = null;
  globalForM2M.m2mCryptoKey = null; // ⚡ Clear CryptoKey cache too
  debugLog('Key cache cleared');
}

export function clearAllCaches(): void {
  clearTokenCache();
  clearPrivateKeyCache();
}

// -----------------------------------------------------------------------------
// Validate Configuration
// -----------------------------------------------------------------------------

export async function validateM2MConfig(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!process.env.SYSTEM_API_KEY) {
    errors.push('SYSTEM_API_KEY is not configured');
  }

  if (!process.env.NEXTJS_PRIVATE_KEY) {
    errors.push('NEXTJS_PRIVATE_KEY is not configured');
  }

  try {
    await loadPrivateKey();
    await getCryptoKey(); // ⚡ Test CryptoKey parsing
  } catch (error) {
    errors.push(`Key configuration error: ${(error as Error).message}`);
  }

  if (errors.length === 0) {
    try {
      await generateM2MToken();
    } catch (error) {
      errors.push(`Token generation error: ${(error as Error).message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export const m2mAuth = {
  loadPrivateKey,
  getCryptoKey, // ⚡ Export new helper if needed elsewhere
  generateM2MToken,
  getM2MHeaders,
  clearTokenCache,
  clearPrivateKeyCache,
  clearAllCaches,
  validateM2MConfig,
};