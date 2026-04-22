const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVENT_NAME = 'Celavive Spa Party';
const SHEET_NAME = 'Registrations';

const HEADERS = [
  'Timestamp',
  'Event Name',
  'Full Name',
  'Birthday',
  'Mobile Number',
  'Email Address',
  'Address',
  'Profession'
];

const PROFESSION_OPTIONS = [
  'Business Owner / Entrepreneur',
  'Teacher',
  'Nurse',
  'Doctor / Physician',
  'Engineer',
  'Accountant',
  'Administrative Assistant',
  'Customer Service Representative',
  'Call Center Agent / BPO Staff',
  'Sales Associate',
  'Marketing Specialist',
  'IT / Software Professional',
  'Web Developer',
  'Graphic Designer',
  'Bank Employee',
  'Government Employee',
  'Police Officer',
  'Military Personnel',
  'Seafarer',
  'Overseas Filipino Worker (OFW)',
  'Driver',
  'Electrician',
  'Construction Worker',
  'Real Estate Agent',
  'Pharmacist',
  'Caregiver',
  'Chef / Cook',
  'Hotel / Restaurant Staff',
  'Freelancer',
  'Student'
];

let tokenCache = {
  accessToken: '',
  expiresAt: 0
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getConfig() {
  return {
    eventName: EVENT_NAME,
    professions: PROFESSION_OPTIONS,
    googleSheetsConfigured: isGoogleSheetsConfigured()
  };
}

function isGoogleSheetsConfigured() {
  const env = getEnv();

  return Boolean(
    env.googleSheetId &&
      env.googleSheetId !== 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE' &&
      (env.googleServiceAccountFile || env.googleServiceAccountJson)
  );
}

function normalizePayload(formData) {
  if (!formData) {
    throw badRequest('Missing form data.');
  }

  const payload = {
    fullName: String(formData.fullName || '').trim(),
    birthday: String(formData.birthday || '').trim(),
    mobileNumber: String(formData.mobileNumber || '').trim(),
    emailAddress: String(formData.emailAddress || '').trim().toLowerCase(),
    address: String(formData.address || '').trim(),
    profession: String(formData.profession || '').trim()
  };

  if (!payload.fullName) {
    throw badRequest('Full name is required.');
  }

  if (!payload.birthday) {
    throw badRequest('Birthday is required.');
  }

  if (!payload.mobileNumber) {
    throw badRequest('Mobile number is required.');
  }

  if (!/^(\+63|0)9\d{9}$/.test(payload.mobileNumber.replace(/[\s-]/g, ''))) {
    throw badRequest('Enter a valid Philippine mobile number.');
  }

  if (!payload.emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.emailAddress)) {
    throw badRequest('Enter a valid email address.');
  }

  if (!payload.address) {
    throw badRequest('Address is required.');
  }

  if (!payload.profession) {
    throw badRequest('Profession is required.');
  }

  if (!PROFESSION_OPTIONS.includes(payload.profession)) {
    throw badRequest('Please select a profession from the list.');
  }

  return payload;
}

async function appendRegistration(payload) {
  if (!isGoogleSheetsConfigured()) {
    throw badRequest(
      'Google Sheets is not configured yet. Add your sheet ID and service account credentials.'
    );
  }

  const env = getEnv();

  await ensureSheetReady(env.googleSheetId);

  const row = [
    new Date().toISOString(),
    EVENT_NAME,
    payload.fullName,
    payload.birthday,
    payload.mobileNumber,
    payload.emailAddress,
    payload.address,
    payload.profession
  ];

  const range = encodeURIComponent(`${SHEET_NAME}!A:H`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  await googleFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [row]
    })
  });
}

async function ensureSheetReady(googleSheetId) {
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}?fields=sheets.properties(sheetId,title,gridProperties.frozenRowCount)`;
  const metadata = await googleFetch(metadataUrl);
  const sheets = Array.isArray(metadata.sheets) ? metadata.sheets : [];
  let sheet = sheets.find((item) => item.properties && item.properties.title === SHEET_NAME);

  if (!sheet) {
    const createResponse = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }
          ]
        })
      }
    );

    sheet = createResponse.replies[0].addSheet;
  }

  const headerRange = encodeURIComponent(`${SHEET_NAME}!A1:H1`);
  const headerData = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/${headerRange}`
  );

  const firstRow = Array.isArray(headerData.values) ? headerData.values[0] : null;
  const hasExpectedHeader =
    Array.isArray(firstRow) &&
    firstRow.length === HEADERS.length &&
    firstRow.every((value, index) => value === HEADERS[index]);

  if (!hasExpectedHeader) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/${headerRange}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${SHEET_NAME}!A1:H1`,
          majorDimension: 'ROWS',
          values: [HEADERS]
        })
      }
    );

    if (sheet && sheet.properties && sheet.properties.sheetId !== undefined) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheet.properties.sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: {
                        bold: true
                      }
                    }
                  },
                  fields: 'userEnteredFormat.textFormat.bold'
                }
              },
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: sheet.properties.sheetId,
                    gridProperties: {
                      frozenRowCount: 1
                    }
                  },
                  fields: 'gridProperties.frozenRowCount'
                }
              }
            ]
          })
        }
      );
    }
  }
}

async function googleFetch(url, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw normalizeGoogleApiError(response.status, text);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

function normalizeGoogleApiError(statusCode, rawText) {
  try {
    const payload = JSON.parse(rawText);
    const message = payload && payload.error && payload.error.message ? payload.error.message : '';
    const details = payload && payload.error && Array.isArray(payload.error.details) ? payload.error.details : [];
    const errorInfo = details.find((item) => item['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo');
    const activationUrl =
      errorInfo && errorInfo.metadata && errorInfo.metadata.activationUrl
        ? errorInfo.metadata.activationUrl
        : 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview';

    if (errorInfo && errorInfo.reason === 'SERVICE_DISABLED') {
      return createError(
        403,
        `Google Sheets API is not enabled yet. Open this link, enable the API, wait a few minutes, then try again: ${activationUrl}`
      );
    }

    if (statusCode === 403) {
      return createError(
        403,
        'Google blocked access to this sheet. Make sure the service account has Editor access to the Google Sheet.'
      );
    }

    return createError(statusCode, message || `Google Sheets request failed (${statusCode}).`);
  } catch (error) {
    return createError(statusCode, `Google Sheets request failed (${statusCode}).`);
  }
}

async function getAccessToken() {
  const now = Date.now();

  if (tokenCache.accessToken && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const serviceAccount = readServiceAccount();
  const jwt = createSignedJwt(serviceAccount);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw createError(response.status, `Unable to get Google access token: ${text}`);
  }

  const result = await response.json();

  tokenCache = {
    accessToken: result.access_token,
    expiresAt: now + Number(result.expires_in || 3600) * 1000
  };

  return tokenCache.accessToken;
}

function readServiceAccount() {
  const env = getEnv();

  if (env.googleServiceAccountJson) {
    const parsed = parseServiceAccountJson(env.googleServiceAccountJson);

    if (!parsed.client_email || !parsed.private_key) {
      throw badRequest('The service account JSON is missing client_email or private_key.');
    }

    return parsed;
  }

  const filePath = path.resolve(process.cwd(), env.googleServiceAccountFile);

  if (!fs.existsSync(filePath)) {
    throw badRequest(`Service account file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  if (!data.client_email || !data.private_key) {
    throw badRequest('The service account JSON file is missing client_email or private_key.');
  }

  return data;
}

function parseServiceAccountJson(input) {
  const trimmed = String(input).trim();

  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  return JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
}

function createSignedJwt(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: issuedAt + 3600,
    iat: issuedAt
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsignedToken), serviceAccount.private_key);

  return `${unsignedToken}.${toBase64Url(signature)}`;
}

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getEnv() {
  return {
    googleSheetId: process.env.GOOGLE_SHEET_ID || '',
    googleServiceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '',
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || ''
  };
}

function badRequest(message) {
  return createError(400, message);
}

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  appendRegistration,
  createError,
  getConfig,
  loadEnvFile,
  normalizePayload
};
