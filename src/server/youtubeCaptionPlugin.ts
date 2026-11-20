import type { Plugin } from 'vite';
import { IncomingMessage, ServerResponse } from 'node:http';
import captionHandler from '../../api/youtube-captions.js';

export function youtubeCaptionPlugin(): Plugin {
  return {
    name: 'youtube-caption-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api/youtube-captions')) {
          return next();
        }
        try {
          await captionHandler(req, res);
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = err?.statusCode || 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: err?.message || 'Lỗi khi tải phụ đề từ YouTube' }));
          }
        }
      });
    }
  };
}
