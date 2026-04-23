const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  handleApiRequest,
  createError,
  loadEnvFile
} = require('./lib/platform');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number.parseInt(process.env.PORT || '8080', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/') || req.url.startsWith('/.netlify/functions/api/')) {
      const apiPath = req.url.startsWith('/.netlify/functions/api/')
        ? req.url.replace('/.netlify/functions/api', '/api')
        : req.url;
      const body = req.method === 'GET' ? {} : await readJsonBody(req);
      const apiResponse = await handleApiRequest({
        method: req.method,
        path: apiPath,
        headers: req.headers,
        body,
        protocol: 'http'
      });

      return sendJson(res, apiResponse.statusCode, apiResponse.payload, apiResponse.headers);
    }

    if (req.method === 'GET') {
      return serveStaticFile(req, res);
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: error.message || 'Something went wrong.'
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Celavive Spa Party app running at http://127.0.0.1:${PORT}`);
});

function serveStaticFile(req, res) {
  const pathname = req.url.split('?')[0];
  const relativePath =
    pathname === '/' || !path.extname(pathname)
      ? path.join('public', 'index.html')
      : path.join('public', pathname.replace(/^\/+/, ''));
  const filePath = path.join(__dirname, relativePath);
  const publicRoot = path.join(__dirname, 'public');

  if (!filePath.startsWith(publicRoot)) {
    return sendJson(res, 403, { error: 'Forbidden.' });
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const content = fs.readFileSync(filePath);

  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1_000_000) {
        reject(badRequest('Request body is too large.'));
      }
    });

    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(badRequest('Invalid JSON request body.'));
      }
    });

    req.on('error', () => reject(createError(500, 'Unable to read request body.')));
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(payload));
}
