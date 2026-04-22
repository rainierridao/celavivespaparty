const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  appendRegistration,
  createError,
  getConfig,
  loadEnvFile,
  normalizePayload
} = require('./lib/registration');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number.parseInt(process.env.PORT || '8080', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/config') {
      return sendJson(res, 200, getConfig());
    }

    if (req.method === 'POST' && req.url === '/api/register') {
      const body = await readJsonBody(req);
      const payload = normalizePayload(body);
      await appendRegistration(payload);

      return sendJson(res, 200, {
        ok: true,
        message: 'Registration saved successfully.'
      });
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
  const requestPath = req.url === '/' ? '/public/index.html' : `/public${req.url}`;
  const filePath = path.join(__dirname, requestPath);

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}
