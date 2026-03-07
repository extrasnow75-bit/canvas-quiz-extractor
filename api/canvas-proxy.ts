import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * SSRF guard for the Canvas proxy.
 * Returns true (= blocked) when the supplied URL string:
 *  - is not a valid URL
 *  - uses a non-HTTPS scheme
 *  - resolves to localhost, a loopback address, or a private/link-local
 *    IPv4 range (RFC 1918 + 169.254.0.0/16 AWS metadata endpoint)
 */
function isBlockedProxyTarget(urlStr: string): boolean {
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
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || 'GET')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBase = req.headers['x-canvas-base'];
  const canvasBase = Array.isArray(rawBase) ? rawBase[0] : rawBase;

  if (!canvasBase) {
    return res.status(400).json({ error: 'Missing x-canvas-base header' });
  }

  if (isBlockedProxyTarget(canvasBase)) {
    return res.status(403).json({
      error: 'Canvas proxy: only HTTPS requests to external hosts are permitted',
    });
  }

  // Reconstruct the Canvas API path from the ?url= query param (set by vercel.json rewrite).
  const urlParam = req.query?.url;
  let urlPath: string;
  if (urlParam) {
    const raw = Array.isArray(urlParam) ? urlParam.join('/') : String(urlParam);
    urlPath = raw.startsWith('/') ? raw : '/' + raw;
  } else {
    const fullPath = req.url || '';
    urlPath = fullPath.replace(/^\/(api\/)?canvas-proxy/, '').split('?')[0] || '/';
  }

  // Preserve any extra query params (e.g. per_page, page) minus the proxy 'url' param.
  const reqUrlObj = new URL(req.url || '', 'http://localhost');
  reqUrlObj.searchParams.delete('url');
  const queryString = reqUrlObj.search;
  const targetUrl = `${canvasBase.replace(/\/$/, '')}${urlPath}${queryString}`;

  // Collect request body
  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body instanceof Buffer) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      body = Buffer.from(req.body);
    } else if (req.body) {
      body = Buffer.from(JSON.stringify(req.body));
    }
  }

  const skipReqHeaders = new Set([
    'host', 'x-canvas-base', 'connection', 'content-length',
    'transfer-encoding', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
  ]);

  const forwardHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (skipReqHeaders.has(k.toLowerCase())) continue;
    const headerValue = Array.isArray(v) ? v.join(', ') : (v ?? '');
    if (headerValue) forwardHeaders[k] = String(headerValue);
  }
  try { forwardHeaders['host'] = new URL(canvasBase).host; } catch { /* ignore */ }

  try {
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: forwardHeaders,
      body: body && !['GET', 'HEAD'].includes(req.method || 'GET') ? body : undefined,
    });

    const skipResHeaders = new Set([
      'transfer-encoding', 'connection', 'content-encoding', 'content-length',
    ]);
    response.headers.forEach((v, k) => {
      if (!skipResHeaders.has(k.toLowerCase())) res.setHeader(k, v);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('content-length', buffer.length);
    return res.status(response.status).end(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: `Canvas proxy error: ${message}` });
  }
};
