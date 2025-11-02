import type { MiddlewareHandler } from 'astro';
import { sequence } from 'astro:middleware';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  
  // Skip middleware completely for prerendered blog pages to avoid redirect loops
  if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) {
    return next();
  }
  
  // Redirect www to non-www
  if (url.hostname.startsWith('www.')) {
    const newUrl = new URL(url);
    newUrl.hostname = url.hostname.replace('www.', '');
    return context.redirect(newUrl.toString(), 301);
  }
  
  // Remove trailing slashes (except for root)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    const newUrl = new URL(url);
    newUrl.pathname = url.pathname.slice(0, -1);
    return context.redirect(newUrl.toString(), 301);
  }
  
  // Continue with the request
  const response = await next();
  
  // Add security headers
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
};
