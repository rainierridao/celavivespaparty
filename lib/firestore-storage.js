const crypto = require('crypto');

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const ROOT_COLLECTION = 'attendanceLeadTables';

let tokenCache = {
  accessToken: '',
  expiresAt: 0
};

function createFirestoreStorage({ getEnv, readServiceAccount, createError, badRequest }) {
  async function ensureTable(tableName, headers, options = {}) {
    const encodedTableName = encodeTableName(tableName);
    const tablePath = tableDocumentPath(encodedTableName);
    const table = await getDocument(tablePath);

    if (!table.exists) {
      await commitWrites([
        {
          update: {
            name: documentName(tablePath),
            fields: {
              title: stringField(tableName),
              nextRowNumber: integerField(2),
              createdAt: stringField(new Date().toISOString()),
              updatedAt: stringField(new Date().toISOString())
            }
          }
        },
        buildRowWrite(encodedTableName, 1, headers)
      ]);
      return;
    }

    const rows = await readRows(tableName);
    const existingHeaders = rows.length ? rows[0].map((value) => String(value || '').trim()) : [];
    const needsHeaderInit = rows.length === 0;
    const needsHeaderMigration =
      Boolean(options.force) ||
      headers.some((header, index) => existingHeaders[index] !== header);

    if (needsHeaderInit || needsHeaderMigration) {
      await commitWrites([buildRowWrite(encodedTableName, 1, headers)]);
    }
  }

  async function appendRows(tableName, rows) {
    const encodedTableName = encodeTableName(tableName);
    const tablePath = tableDocumentPath(encodedTableName);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const table = await getDocument(tablePath);
      const nextRowNumber = table.exists
        ? Number(getFieldValue(table.document.fields && table.document.fields.nextRowNumber) || 2)
        : 2;
      const updateTime = table.document && table.document.updateTime;
      const timestamp = new Date().toISOString();
      const writes = [];

      if (!table.exists) {
        writes.push({
          update: {
            name: documentName(tablePath),
            fields: {
              title: stringField(tableName),
              nextRowNumber: integerField(nextRowNumber + rows.length),
              createdAt: stringField(timestamp),
              updatedAt: stringField(timestamp)
            }
          }
        });
      } else {
        writes.push({
          update: {
            name: documentName(tablePath),
            fields: {
              title: stringField(tableName),
              nextRowNumber: integerField(nextRowNumber + rows.length),
              updatedAt: stringField(timestamp)
            }
          },
          updateMask: {
            fieldPaths: ['title', 'nextRowNumber', 'updatedAt']
          },
          currentDocument: {
            updateTime
          }
        });
      }

      rows.forEach((row, index) => {
        writes.push(buildRowWrite(encodedTableName, nextRowNumber + index, row));
      });

      try {
        await commitWrites(writes);
        return;
      } catch (error) {
        if (error.statusCode !== 409 || attempt === 4) {
          throw error;
        }
      }
    }
  }

  async function updateRow(tableName, rowNumber, values) {
    const encodedTableName = encodeTableName(tableName);
    await commitWrites([buildRowWrite(encodedTableName, rowNumber, values)]);
  }

  async function deleteRow(tableName, rowNumber) {
    const encodedTableName = encodeTableName(tableName);
    await commitWrites([
      {
        delete: documentName(rowDocumentPath(encodedTableName, rowNumber))
      }
    ]);
  }

  async function readRows(tableName) {
    const encodedTableName = encodeTableName(tableName);
    const rowsPath = `${tableDocumentPath(encodedTableName)}/rows`;
    const documents = [];
    let pageToken = '';

    do {
      const query = new URLSearchParams({
        pageSize: '1000',
        orderBy: 'rowNumber'
      });

      if (pageToken) {
        query.set('pageToken', pageToken);
      }

      const response = await firestoreFetch(`${firestoreBaseUrl()}/${rowsPath}?${query.toString()}`);
      documents.push(...(Array.isArray(response.documents) ? response.documents : []));
      pageToken = response.nextPageToken || '';
    } while (pageToken);

    return documents
      .map((document) => ({
        rowNumber: Number(getFieldValue(document.fields && document.fields.rowNumber) || 0),
        values: getFieldValue(document.fields && document.fields.values) || []
      }))
      .filter((row) => row.rowNumber > 0)
      .sort((left, right) => left.rowNumber - right.rowNumber)
      .map((row) => row.values);
  }

  async function exportAllTables() {
    const response = await firestoreFetch(`${firestoreBaseUrl()}/${ROOT_COLLECTION}?pageSize=1000`);
    const documents = Array.isArray(response.documents) ? response.documents : [];
    const tables = [];

    for (const document of documents) {
      const name = String(getFieldValue(document.fields && document.fields.title) || '');
      if (!name) {
        continue;
      }
      tables.push({
        name,
        rows: await readRows(name)
      });
    }

    return tables.sort((left, right) => left.name.localeCompare(right.name));
  }

  async function replaceTable(tableName, rows) {
    const encodedTableName = encodeTableName(tableName);
    const existing = await firestoreFetch(
      `${firestoreBaseUrl()}/${tableDocumentPath(encodedTableName)}/rows?pageSize=1000`
    );
    const existingDocuments = Array.isArray(existing.documents) ? existing.documents : [];
    const timestamp = new Date().toISOString();
    const writes = [
      {
        update: {
          name: documentName(tableDocumentPath(encodedTableName)),
          fields: {
            title: stringField(tableName),
            nextRowNumber: integerField(rows.length + 1),
            createdAt: stringField(timestamp),
            updatedAt: stringField(timestamp)
          }
        }
      },
      ...existingDocuments.map((document) => ({
        delete: document.name
      })),
      ...rows.map((row, index) => buildRowWrite(encodedTableName, index + 1, row))
    ];

    for (let index = 0; index < writes.length; index += 450) {
      await commitWrites(writes.slice(index, index + 450));
    }
  }

  function buildRowWrite(encodedTableName, rowNumber, values) {
    return {
      update: {
        name: documentName(rowDocumentPath(encodedTableName, rowNumber)),
        fields: {
          rowNumber: integerField(rowNumber),
          values: arrayField(values.map((value) => stringField(value))),
          updatedAt: stringField(new Date().toISOString())
        }
      }
    };
  }

  async function getDocument(path) {
    const response = await firestoreFetch(`${firestoreBaseUrl()}/${path}`, {
      allowMissing: true
    });

    return response.found
      ? { exists: true, document: response.payload }
      : { exists: false, document: null };
  }

  async function commitWrites(writes) {
    await firestoreFetch(`${firestoreBaseUrl()}:commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes })
    });
  }

  async function firestoreFetch(url, options = {}) {
    const accessToken = await getFirestoreAccessToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {})
      }
    });

    if (response.status === 404 && options.allowMissing) {
      return { found: false, payload: null };
    }

    if (!response.ok) {
      const text = await response.text();
      throw normalizeFirestoreError(response.status, text);
    }

    if (response.status === 204) {
      return options.allowMissing ? { found: true, payload: {} } : {};
    }

    const payload = await response.json();
    return options.allowMissing ? { found: true, payload } : payload;
  }

  async function getFirestoreAccessToken() {
    const now = Date.now();

    if (tokenCache.accessToken && now < tokenCache.expiresAt - 60_000) {
      return tokenCache.accessToken;
    }

    const serviceAccount = readServiceAccount();
    const jwt = createSignedJwt(serviceAccount, FIRESTORE_SCOPE);
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
      throw createError(response.status, `Unable to get Firebase access token: ${text}`);
    }

    const result = await response.json();
    tokenCache = {
      accessToken: result.access_token,
      expiresAt: now + Number(result.expires_in || 3600) * 1000
    };

    return tokenCache.accessToken;
  }

  function createSignedJwt(serviceAccount, scope) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    const payload = {
      iss: serviceAccount.client_email,
      scope,
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

  function firestoreBaseUrl() {
    const projectId = getFirebaseProjectId();

    if (!projectId) {
      throw badRequest('Firebase is not configured yet. Add FIREBASE_PROJECT_ID.');
    }

    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  }

  function normalizeFirestoreError(statusCode, rawText) {
    try {
      const payload = JSON.parse(rawText);
      const message = payload && payload.error && payload.error.message ? payload.error.message : '';

      if (statusCode === 409) {
        return createError(409, message || 'Firebase write conflict. Please try again.');
      }

      if (statusCode === 403) {
        return createError(
          403,
          `Firebase blocked access. Make sure Firestore is enabled and the service account can read/write it.${message ? ` Firebase says: ${message}` : ''}`
        );
      }

      return createError(statusCode, message || `Firebase request failed (${statusCode}).`);
    } catch (error) {
      return createError(statusCode, `Firebase request failed (${statusCode}).`);
    }
  }

  function documentName(path) {
    const projectId = getFirebaseProjectId();
    return `projects/${projectId}/databases/(default)/documents/${path}`;
  }

  function getFirebaseProjectId() {
    const env = getEnv();
    const explicitProjectId = env.firebaseProjectId || env.googleCloudProjectId;

    if (explicitProjectId) {
      return explicitProjectId;
    }

    const serviceAccount = readServiceAccount();
    return serviceAccount.project_id || '';
  }

  function tableDocumentPath(encodedTableName) {
    return `${ROOT_COLLECTION}/${encodedTableName}`;
  }

  function rowDocumentPath(encodedTableName, rowNumber) {
    return `${tableDocumentPath(encodedTableName)}/rows/${String(rowNumber).padStart(12, '0')}`;
  }

  return {
    appendRows,
    deleteRow,
    ensureTable,
    exportAllTables,
    replaceTable,
    readRows,
    updateRow
  };
}

function encodeTableName(tableName) {
  return `table_${crypto
    .createHash('sha256')
    .update(String(tableName || ''))
    .digest('hex')}`;
}

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function stringField(value) {
  return {
    stringValue: value === undefined || value === null ? '' : String(value)
  };
}

function integerField(value) {
  return {
    integerValue: String(Number.parseInt(value, 10) || 0)
  };
}

function arrayField(values) {
  return {
    arrayValue: {
      values
    }
  };
}

function getFieldValue(field) {
  if (!field || typeof field !== 'object') {
    return '';
  }

  if (field.stringValue !== undefined) {
    return field.stringValue;
  }

  if (field.integerValue !== undefined) {
    return Number(field.integerValue);
  }

  if (field.arrayValue !== undefined) {
    const values = Array.isArray(field.arrayValue.values) ? field.arrayValue.values : [];
    return values.map((value) => getFieldValue(value));
  }

  return '';
}

module.exports = {
  createFirestoreStorage
};
