/**
 * Security utilities for API endpoints
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Rate limiting using Cloudflare KV
 * Returns true if rate limit is exceeded
 */
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 3600
): Promise<{ limited: boolean; remaining: number }> {
  if (!kv) {
    // If KV not available, allow request but log warning
    console.warn('Rate limiting KV not configured');
    return { limited: false, remaining: maxRequests };
  }

  try {
    const currentCount = await kv.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= maxRequests) {
      return { limited: true, remaining: 0 };
    }

    // Increment counter
    await kv.put(key, (count + 1).toString(), {
      expirationTtl: windowSeconds
    });

    return { limited: false, remaining: maxRequests - count - 1 };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request (fail open)
    return { limited: false, remaining: maxRequests };
  }
}

/**
 * Verify request origin to prevent CSRF attacks
 */
export function verifyOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    // Allow if it's a same-origin request (no origin/referer headers)
    // This is common for direct API calls from the same domain
    return true;
  }

  // Check origin header
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (allowedOrigins.includes(refererOrigin)) {
        return true;
      }
    } catch {
      // Invalid referer URL
      return false;
    }
  }

  return false;
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  // Cloudflare provides the real IP in CF-Connecting-IP header
  return request.headers.get('cf-connecting-ip') 
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * Validate email format (server-side)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate and sanitize text input
 */
export function sanitizeTextInput(
  input: string, 
  maxLength: number,
  fieldName: string = 'Input'
): { valid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, sanitized: '', error: `${fieldName} is required` };
  }

  const trimmed = input.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, sanitized: '', error: `${fieldName} cannot be empty` };
  }

  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      sanitized: '', 
      error: `${fieldName} must be ${maxLength} characters or less` 
    };
  }

  return { valid: true, sanitized: trimmed };
}
