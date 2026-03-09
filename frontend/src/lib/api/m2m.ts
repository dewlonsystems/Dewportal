// =============================================================================
// DEWPORTAL FRONTEND - M2M AUTHENTICATION
// =============================================================================
// Machine-to-Machine authentication for Next.js Server Actions to Django.
// Signs JWT tokens with Next.js RSA private key for secure server-to-server communication.
// =============================================================================

import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
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
}

export interface M2MTokenResult {
  token: string;
  expiresAt: number;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

// FIX #1: Add `as const` to preserve literal types for ALGORITHM
const M2M_CONFIG = {
  ISSUER: 'nextjs-server',
  AUDIENCE: 'dewportal-django',
  TOKEN_LIFETIME: 300, // 5 minutes in seconds
  ALGORITHM: 'RS256',
} as const;

// -----------------------------------------------------------------------------
// Private Key Cache
// -----------------------------------------------------------------------------

let cachedPrivateKey: string | null = null;
let tokenCache: M2MTokenResult | null = null;

// -----------------------------------------------------------------------------
// Load Private Key
// -----------------------------------------------------------------------------

/**
 * Load the Next.js RSA private key from file system.
 * This key is used to sign M2M JWT tokens.
 * 
 * SECURITY: This key is NEVER exposed to the browser.
 * It only exists on the Next.js server and is used in Server Actions.
 */
export function loadPrivateKey(): string {
  // Return cached key if available
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  try {
    // Get key path from environment
    const keyPath = process.env.NEXTJS_PRIVATE_KEY_PATH;

    if (!keyPath) {
      throw new Error('NEXTJS_PRIVATE_KEY_PATH environment variable is not set');
    }

    // Resolve path (relative to project root)
    const resolvedPath = path.resolve(process.cwd(), keyPath);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Private key not found at: ${resolvedPath}`);
    }

    // Read private key
    const privateKey = fs.readFileSync(resolvedPath, 'utf-8');

    // Validate key format
    if (!privateKey.includes('-----BEGIN RSA PRIVATE KEY-----') &&
        !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format');
    }

    // Cache the key
    cachedPrivateKey = privateKey;

    debugLog('M2M private key loaded successfully');

    return privateKey;

  } catch (error) {
    errorLog('Failed to load M2M private key', error);
    throw new Error('M2M authentication configuration error');
  }
}

// -----------------------------------------------------------------------------
// Generate M2M JWT Token
// -----------------------------------------------------------------------------

/**
 * Generate a signed JWT token for M2M authentication.
 * 
 * This token is:
 * - Signed with Next.js server's RSA private key
 * - Verified by Django using Next.js server's RSA public key
 * - Short-lived (5 minutes) for security
 * - Cached to avoid regenerating on every request
 */
export async function generateM2MToken(): Promise<string> {
  try {
    // Check if we have a valid cached token
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
      // Token is still valid (with 1 minute buffer)
      debugLog('Using cached M2M token');
      return tokenCache.token;
    }

    // Load private key
    const privateKey = loadPrivateKey();

    // Get system API key
    const systemApiKey = process.env.SYSTEM_API_KEY;
    if (!systemApiKey) {
      throw new Error('SYSTEM_API_KEY environment variable is not set');
    }

    // Generate unique JTI (JWT ID)
    const jti = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const exp = now + M2M_CONFIG.TOKEN_LIFETIME;

    // Create token payload
    const payload: M2MTokenPayload = {
      iss: M2M_CONFIG.ISSUER,
      iat: now,
      exp: exp,
      jti: jti,
      aud: M2M_CONFIG.AUDIENCE,
    };

    // FIX #2: Cast options to jwt.SignOptions and ensure privateKey is typed
    const token = jwt.sign(
      payload, 
      privateKey, 
      {
        algorithm: M2M_CONFIG.ALGORITHM,
      } as jwt.SignOptions // <--- This cast resolves the overload error
    );

    // Cache the token
    tokenCache = {
      token,
      expiresAt: exp * 1000, // Convert to milliseconds
    };

    debugLog('M2M token generated successfully', {
      jti,
      expiresAt: new Date(exp * 1000).toISOString(),
    });

    return token;

  } catch (error) {
    errorLog('Failed to generate M2M token', error);
    throw new Error('M2M token generation failed');
  }
}

// -----------------------------------------------------------------------------
// Get M2M Headers
// -----------------------------------------------------------------------------

/**
 * Get complete M2M authentication headers for API requests.
 * 
 * These headers must be included in ALL requests from Next.js to Django:
 * - X-System-API-Key: Static API key for server identification
 * - X-M2M-Authorization: Bearer JWT signed with RSA private key
 */
export async function getM2MHeaders(): Promise<Record<string, string>> {
  try {
    const systemApiKey = process.env.SYSTEM_API_KEY;

    if (!systemApiKey) {
      throw new Error('SYSTEM_API_KEY environment variable is not set');
    }

    // Generate M2M JWT token
    const token = await generateM2MToken();

    // Build headers
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
    errorLog('Failed to generate M2M headers', error);
    throw new Error('M2M authentication failed');
  }
}

// -----------------------------------------------------------------------------
// Clear Token Cache
// -----------------------------------------------------------------------------

/**
 * Clear the cached M2M token.
 * Useful for testing or when keys are rotated.
 */
export function clearTokenCache(): void {
  tokenCache = null;
  debugLog('M2M token cache cleared');
}

/**
 * Clear the cached private key.
 * Useful for key rotation.
 */
export function clearPrivateKeyCache(): void {
  cachedPrivateKey = null;
  debugLog('M2M private key cache cleared');
}

/**
 * Clear all M2M caches.
 */
export function clearAllCaches(): void {
  clearTokenCache();
  clearPrivateKeyCache();
}

// -----------------------------------------------------------------------------
// Validate M2M Configuration
// -----------------------------------------------------------------------------

/**
 * Validate that M2M authentication is properly configured.
 * Call this during application startup to catch configuration errors early.
 */
export async function validateM2MConfig(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check SYSTEM_API_KEY
  if (!process.env.SYSTEM_API_KEY) {
    errors.push('SYSTEM_API_KEY environment variable is not set');
  }

  // Check NEXTJS_PRIVATE_KEY_PATH
  if (!process.env.NEXTJS_PRIVATE_KEY_PATH) {
    errors.push('NEXTJS_PRIVATE_KEY_PATH environment variable is not set');
  } else {
    // Check if key file exists
    const keyPath = path.resolve(process.cwd(), process.env.NEXTJS_PRIVATE_KEY_PATH);
    if (!fs.existsSync(keyPath)) {
      errors.push(`Private key not found at: ${keyPath}`);
    }
  }

  // Try to load private key
  try {
    loadPrivateKey();
  } catch (error) {
    errors.push(`Failed to load private key: ${(error as Error).message}`);
  }

  // Try to generate a token
  if (errors.length === 0) {
    try {
      await generateM2MToken();
    } catch (error) {
      errors.push(`Failed to generate M2M token: ${(error as Error).message}`);
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
  generateM2MToken,
  getM2MHeaders,
  clearTokenCache,
  clearPrivateKeyCache,
  clearAllCaches,
  validateM2MConfig,
};