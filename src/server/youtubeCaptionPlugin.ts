import type { Plugin } from 'vite';
import { IncomingMessage, ServerResponse } from 'node:http';
import captionHandler from '../../api/youtube-captions.js';
import { handleReelsFeedRequest } from '../../api/reels-feed.js';

export function youtubeCaptionPlugin(): Plugin {
  return {
    name: 'youtube-caption-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next();

        if (req.url.startsWith('/api/reels')) {
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            await handleReelsFeedRequest(req, res, decodeURIComponent(parsedUrl.pathname));
          } catch (err: unknown) {
            if (!res.headersSent) {
              const e = err as { statusCode?: number; message?: string };
              res.statusCode = e?.statusCode || 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: e?.message || 'Lỗi khi tải feed Shorts' }));
            }
          }
          return;
        }

        if (!req.url.startsWith('/api/youtube-captions')) {
          return next();
        }
        try {
          await captionHandler(req, res);
        } catch (err: unknown) {
          if (!res.headersSent) {
            const e = err as { statusCode?: number; message?: string };
            res.statusCode = e?.statusCode || 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: e?.message || 'Lỗi khi tải phụ đề từ YouTube' }));
          }
        }
      });
    }
  };
}
