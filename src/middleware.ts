import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  
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
  
  return next();
};
