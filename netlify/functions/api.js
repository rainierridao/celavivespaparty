const {
  appendRegistration,
  createError,
  getConfig,
  normalizePayload
} = require('../../lib/registration');

exports.handler = async (event) => {
  try {
    const route = getRoute(event.path);

    if (event.httpMethod === 'GET' && route === '/config') {
      return json(200, getConfig());
    }

    if (event.httpMethod === 'POST' && route === '/register') {
      const body = event.body ? JSON.parse(event.body) : {};
      const payload = normalizePayload(body);

      await appendRegistration(payload);

      return json(200, {
        ok: true,
        message: 'Registration saved successfully.'
      });
    }

    return json(404, { error: 'Not found.' });
  } catch (error) {
    const normalizedError = error && error.statusCode ? error : createError(500, 'Something went wrong.');
    return json(normalizedError.statusCode, {
      error: normalizedError.message || 'Something went wrong.'
    });
  }
};

function getRoute(requestPath) {
  const marker = '/.netlify/functions/api';
  const index = requestPath.indexOf(marker);

  if (index === -1) {
    return requestPath;
  }

  const route = requestPath.slice(index + marker.length);
  return route || '/';
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(payload)
  };
}
