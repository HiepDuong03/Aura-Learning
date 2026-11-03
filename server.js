import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import captionHandler from './api/youtube-captions.js';
import { handleAuthAndSync } from './api/auth-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, filePath, contentType) {
  try {
    const stat = fs.statSync(filePath);
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stat.size,
    };

    // Cache-control optimization
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (path.basename(filePath) === 'sw.js') {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      headers['Service-Worker-Allowed'] = '/';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || '/';
  const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. YouTube Caption API Endpoint
  if (pathname.startsWith('/api/youtube-captions')) {
    try {
      await captionHandler(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'API Internal Error' }));
      }
    }
    return;
  }

  // 2. Production Cloud Authentication & Multi-Device Sync API
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/sync')) {
    try {
      await handleAuthAndSync(req, res, pathname);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Auth/Sync Internal Error' }));
      }
    }
    return;
  }

  // 3. Health check endpoint for Render zero-downtime deploy & uptime monitoring
  if (pathname === '/healthz' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Only GET & HEAD for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // 3. Static File Resolution with Path Traversal Protection
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    sendFile(res, safePath, contentType);
    return;
  }

  // 4. SPA Fallback: Serve dist/index.html for any unmatched client routes
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    sendFile(res, indexPath, 'text/html; charset=utf-8');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Frontend build missing. Run `npm run build` first.');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 [Production Server] Running at http://${HOST}:${PORT}`);
  console.log(`📁 Serving static build from: ${DIST_DIR}`);
});

// Graceful termination for Render deployments
const shutdown = () => {
  console.log('Stopping server gracefully...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
