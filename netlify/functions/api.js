const {
  handleApiRequest,
  createError,
  loadEnvFile
} = require('../../lib/platform');

loadEnvFile(require('path').join(process.cwd(), '.env'));

exports.handler = async (event) => {
  try {
    const apiResponse = await handleApiRequest({
      method: event.httpMethod,
      path: event.path,
      headers: event.headers || {},
      body: event.body ? JSON.parse(event.body) : {},
      protocol: 'https'
    });

    return json(apiResponse.statusCode, apiResponse.payload, apiResponse.headers);
  } catch (error) {
    const normalizedError = error && error.statusCode ? error : createError(500, 'Something went wrong.');
    return json(
      normalizedError.statusCode,
      {
        error: normalizedError.message || 'Something went wrong.'
      },
      {}
    );
  }
};

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    },
    body: JSON.stringify(payload)
  };
}
