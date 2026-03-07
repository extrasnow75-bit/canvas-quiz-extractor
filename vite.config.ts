import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * SSRF guard for the Canvas proxy.
 *
 * Returns true (= blocked) when the supplied URL string:
 *  - is not a valid URL
 *  - uses a non-HTTPS scheme
 *  - resolves to localhost, a loopback address, or a private/link-local
 *    IPv4 range (RFC 1918 + 169.254.0.0/16 AWS metadata endpoint)
 */
const isBlockedProxyTarget = (urlStr: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return true;
  }
  if (parsed.protocol !== 'https:') return true;
  const h = parsed.hostname;
  // Block loopback and all IPv6 addresses (any hostname containing ':')
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.includes(':')) return true;
  const oct = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (oct) {
    const [, a, b] = oct.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
  }
  return false;
};

/**
 * Custom Canvas proxy plugin for the dev server.
 * The client sends the real Canvas base URL in the `x-canvas-base` header
 * so a single dev server can reach any institution without changing config.
 */
const canvasProxyPlugin = (): Plugin => ({
  name: 'canvas-dynamic-proxy',
  configureServer(server) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (!req.url?.startsWith('/canvas-proxy')) return next();

      const rawBase = req.headers['x-canvas-base'];
      const canvasBase = Array.isArray(rawBase) ? rawBase[0] : rawBase;

      if (!canvasBase) {
        res.statusCode = 400;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing x-canvas-base header' }));
        return;
      }

      if (isBlockedProxyTarget(canvasBase)) {
        res.statusCode = 403;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'Canvas proxy: only HTTPS requests to external hosts are permitted' }));
        return;
      }

      const urlPath = req.url.replace(/^\/canvas-proxy/, '') || '/';
      const targetUrl = `${canvasBase.replace(/\/$/, '')}${urlPath}`;

      const body: Buffer = await new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });

      const skipReqHeaders = new Set([
        'host', 'x-canvas-base', 'connection',
        'content-length', 'transfer-encoding',
      ]);
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (skipReqHeaders.has(k.toLowerCase())) continue;
        forwardHeaders[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
      }
      try { forwardHeaders['host'] = new URL(canvasBase).host; } catch { /* ignore */ }

      try {
        const response = await fetch(targetUrl, {
          method: req.method ?? 'GET',
          headers: forwardHeaders,
          body: body.length > 0 && !['GET', 'HEAD'].includes(req.method ?? 'GET')
            ? body
            : undefined,
        });

        res.statusCode = response.status;

        const skipResHeaders = new Set([
          'transfer-encoding', 'connection', 'content-encoding', 'content-length',
        ]);
        response.headers.forEach((v, k) => {
          if (!skipResHeaders.has(k.toLowerCase())) res.setHeader(k, v);
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('content-length', buffer.length);
        res.end(buffer);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: `Canvas proxy error: ${message}` }));
        }
      }
    });
  },
});

export default defineConfig({
  server: {
    port: 3002,
    strictPort: false,
    host: '0.0.0.0',
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.instructure.com ws://localhost:* wss://localhost:*",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; '),
    },
  },
  plugins: [react(), canvasProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
