import captionHandler from './youtube-captions.js';
import { handleAuthAndSync } from './auth-sync.js';
import { handleReelsFeedRequest } from './reels-feed.js';

/**
 * Unified Vercel Serverless Function entrypoint for Aura Learning API.
 * Mirrors the exact API routing in `server.js` while preserving local/Render compatibility.
 */
export default async function handler(req, res) {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);

  let pathname = parsedUrl.pathname || '/';
  if (parsedUrl.searchParams.has('__route')) {
    const routePart = String(parsedUrl.searchParams.get('__route') || '').replace(/^\/+/, '');
    parsedUrl.searchParams.delete('__route');
    pathname = `/api/${routePart}`;
    const remainingSearch = parsedUrl.searchParams.toString();
    req.url = remainingSearch ? `${pathname}?${remainingSearch}` : pathname;
  }

  // 1. Health check
  if (pathname === '/api/health' || pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', runtime: 'vercel', timestamp: new Date().toISOString() }));
    return;
  }

  // 2. YouTube Captions proxy
  if (pathname === '/api/youtube-captions') {
    try {
      await captionHandler(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(err?.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err?.message || 'Caption API Error' }));
      }
    }
    return;
  }

  // 3. Auto-updating Reels feed & channel/short resolver
  if (pathname.startsWith('/api/reels')) {
    try {
      await handleReelsFeedRequest(req, res, pathname);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(err?.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err?.message || 'Reels Feed API Error' }));
      }
    }
    return;
  }

  // 4. Auth, Cloud Sync, Admin RBAC, AI Coaching & Dictionary Cache
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/sync') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/api/dict')
  ) {
    try {
      await handleAuthAndSync(req, res, pathname);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err?.message || 'API Internal Error' }));
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: `API route not found: ${pathname}` }));
}
