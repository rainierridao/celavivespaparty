const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVENT_TYPES = ['OPP', 'Celavive Spa Party'];
const EVENT_SHEET_NAME = 'Events';
const USER_SHEET_NAME = 'Users';
const PASSWORD_RESET_SHEET_NAME = 'Password Reset Tokens';
const SESSION_COOKIE_NAME = 'celavive_admin_session';
const EVENT_NAME = 'Celavive Spa Party';
const RSVP_HEADERS = [
  'Timestamp',
  'Event ID',
  'Event Type',
  'Event Label',
  'Location',
  'Date Time',
  'Full Name',
  'Email Address',
  'Mobile Number',
  'Profession',
  'Invited By',
  'Attendance Confirmation'
];
const ATTENDANCE_HEADERS = [
  'Timestamp',
  'Event ID',
  'Event Type',
  'Event Label',
  'Location',
  'Date Time',
  'Full Name',
  'Birthday',
  'Mobile Number',
  'Email Address',
  'Address',
  'Profession'
];
const USER_HEADERS = ['User ID', 'Full Name', 'Email Address', 'Password Hash', 'Created At'];
const PASSWORD_RESET_HEADERS = [
  'Token Hash',
  'Email Address',
  'Expires At',
  'Used At',
  'Created At'
];
const EVENT_HEADERS = [
  'Event ID',
  'Event Type',
  'Event Label',
  'Location',
  'Date Time',
  'RSVP Sheet Name',
  'Attendance Sheet Name',
  'Created By',
  'Created At',
  'Public Slug',
  'Status',
  'Archived At',
  'Updated At',
  'RSVP Accepting',
  'RSVP Max Yes',
  'RSVP Limit Required'
];
const RSVP_YES_VALUE = 'Yes, I will be attending';
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
const CACHE_TTLS = {
  events: 30_000,
  rows: 15_000,
  spreadsheetMetadata: 60_000,
  ensuredSheet: 10 * 60_000
};
let spreadsheetMetadataCache = {
  value: null,
  expiresAt: 0
};
const sheetRowsCache = new Map();
const ensuredSheetCache = new Map();

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

async function handleApiRequest({ method, path: requestPath, headers = {}, body, protocol = 'https' }) {
  const route = normalizeApiPath(requestPath);

  if (method === 'GET' && route === '/config') {
    return response(200, getPublicConfig());
  }

  if (method === 'GET' && route === '/auth/session') {
    const user = await requireOptionalUser(headers);

    return response(200, {
      authenticated: Boolean(user),
      user: user ? sanitizeUser(user) : null
    });
  }

  if (method === 'POST' && route === '/auth/signup') {
    const payload = normalizeSignupPayload(body);
    const user = await createUser(payload);
    const sessionToken = createSessionToken(user);

    return response(
      200,
      {
        ok: true,
        user: sanitizeUser(user)
      },
      {
        'Set-Cookie': buildSessionCookie(sessionToken, protocol === 'https')
      }
    );
  }

  if (method === 'POST' && route === '/auth/login') {
    const payload = normalizeLoginPayload(body);
    const user = await authenticateUser(payload);
    const sessionToken = createSessionToken(user);

    return response(
      200,
      {
        ok: true,
        user: sanitizeUser(user)
      },
      {
        'Set-Cookie': buildSessionCookie(sessionToken, protocol === 'https')
      }
    );
  }

  if (method === 'POST' && route === '/auth/logout') {
    return response(
      200,
      { ok: true },
      {
        'Set-Cookie': clearSessionCookie(protocol === 'https')
      }
    );
  }

  if (method === 'POST' && route === '/auth/change-password') {
    const user = await requireUser(headers);
    const payload = normalizeChangePasswordPayload(body);
    await changeUserPassword(user, payload);

    return response(200, {
      ok: true
    });
  }

  if (method === 'POST' && route === '/auth/forgot-password') {
    const payload = normalizeForgotPasswordPayload(body);
    await createPasswordRecovery(payload, headers, protocol);

    return response(200, {
      ok: true,
      message: 'If an account exists for that email, a recovery link has been sent.'
    });
  }

  if (method === 'POST' && route === '/auth/reset-password') {
    const payload = normalizeResetPasswordPayload(body);
    await resetPasswordWithRecoveryToken(payload);

    return response(200, {
      ok: true
    });
  }

  if (method === 'GET' && route === '/events') {
    const user = await requireUser(headers);
    const events = await listEvents();

    return response(200, {
      ok: true,
      user: sanitizeUser(user),
      events
    });
  }

  if (method === 'POST' && route === '/events') {
    const user = await requireUser(headers);
    const payload = normalizeEventPayload(body);
    const event = await createEvent(payload, user);

    return response(200, {
      ok: true,
      event
    });
  }

  const eventRouteMatch = route.match(/^\/events\/([^/]+)$/);

  if (method === 'GET' && eventRouteMatch) {
    await requireUser(headers);
    const event = await getEventById(eventRouteMatch[1]);
    const availability = await getRsvpAvailability(event);

    return response(200, {
      ok: true,
      event: {
        ...event,
        rsvpAvailability: availability
      }
    });
  }

  if (method === 'PATCH' && eventRouteMatch) {
    await requireUser(headers);
    const payload = normalizeEventMutationPayload(body);
    const result = await updateEvent(eventRouteMatch[1], payload);

    return response(200, {
      ok: true,
      event: result.event,
      message: result.message
    });
  }

  if (method === 'DELETE' && eventRouteMatch) {
    await requireUser(headers);
    await deleteEvent(eventRouteMatch[1]);

    return response(200, {
      ok: true,
      message: 'Event deleted.'
    });
  }

  const rsvpResponseRouteMatch = route.match(/^\/events\/([^/]+)\/rsvp-responses$/);

  if (method === 'GET' && rsvpResponseRouteMatch) {
    await requireUser(headers);
    const event = await getEventById(rsvpResponseRouteMatch[1]);
    const responses = await readSheetObjects(event.rsvpSheetName);

    return response(200, {
      ok: true,
      event,
      responses
    });
  }

  const attendanceResponseRouteMatch = route.match(/^\/events\/([^/]+)\/attendance-responses$/);

  if (method === 'GET' && attendanceResponseRouteMatch) {
    await requireUser(headers);
    const event = await getEventById(attendanceResponseRouteMatch[1]);
    const responses = await readSheetObjects(event.attendanceSheetName);

    return response(200, {
      ok: true,
      event,
      responses
    });
  }

  const publicEventRouteMatch = route.match(/^\/public-events\/([^/]+)$/);

  if (method === 'GET' && publicEventRouteMatch) {
    const event = await getEventById(publicEventRouteMatch[1]);
    const availability = await getRsvpAvailability(event);

    return response(200, {
      ok: true,
      event: {
        ...event,
        rsvpAvailability: availability
      }
    });
  }

  const rsvpSubmitRouteMatch = route.match(/^\/events\/([^/]+)\/rsvp$/);

  if (method === 'POST' && rsvpSubmitRouteMatch) {
    const event = await getEventById(rsvpSubmitRouteMatch[1]);
    const payload = normalizeRsvpPayload(body);
    const availability = await getRsvpAvailability(event);

    if (!availability.canAccept) {
      throw createError(409, availability.message);
    }

    await appendRsvp(event, payload);

    return response(200, {
      ok: true,
      message: 'RSVP saved successfully.'
    });
  }

  const attendanceSubmitRouteMatch = route.match(/^\/events\/([^/]+)\/attendance$/);

  if (method === 'POST' && attendanceSubmitRouteMatch) {
    const event = await getEventById(attendanceSubmitRouteMatch[1]);
    const payload = normalizeAttendancePayload(body);
    await appendAttendance(event, payload);

    return response(200, {
      ok: true,
      message: 'Attendance saved successfully.'
    });
  }

  return response(404, { error: 'Not found.' });
}

function getPublicConfig() {
  return {
    eventName: EVENT_NAME,
    eventTypes: EVENT_TYPES,
    professions: PROFESSION_OPTIONS,
    googleSheetsConfigured: isGoogleSheetsConfigured()
  };
}

function response(statusCode, payload, headers = {}) {
  return {
    statusCode,
    payload,
    headers
  };
}

function normalizeApiPath(requestPath) {
  if (!requestPath) {
    return '/';
  }

  const pathname = requestPath.split('?')[0];

  if (pathname.startsWith('/.netlify/functions/api')) {
    return pathname.slice('/.netlify/functions/api'.length) || '/';
  }

  if (pathname.startsWith('/api')) {
    return pathname.slice('/api'.length) || '/';
  }

  return pathname;
}

async function requireOptionalUser(headers) {
  try {
    return await requireUser(headers);
  } catch (error) {
    return null;
  }
}

async function requireUser(headers) {
  const cookies = parseCookies(headers.cookie || headers.Cookie || '');
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    throw createError(401, 'Please log in to continue.');
  }

  const payload = verifySessionToken(token);
  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw createError(401, 'Your session is no longer valid.');
  }

  return user;
}

function parseCookies(cookieHeader) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function createSessionToken(user) {
  const payload = {
    email: user.emailAddress,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  const parts = String(token || '').split('.');

  if (parts.length !== 2) {
    throw createError(401, 'Invalid session token.');
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw createError(401, 'Invalid session signature.');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

  if (!payload.exp || payload.exp < Date.now()) {
    throw createError(401, 'Your session has expired.');
  }

  return payload;
}

function getAuthSecret() {
  const env = getEnv();

  if (env.authSecret) {
    return env.authSecret;
  }

  const serviceAccount = readServiceAccount();
  return `${env.googleSheetId}:${serviceAccount.private_key}`;
}

function buildSessionCookie(value, secure) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 7}`,
    secure ? 'Secure' : ''
  ]
    .filter(Boolean)
    .join('; ');
}

function clearSessionCookie(secure) {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : ''
  ]
    .filter(Boolean)
    .join('; ');
}

function sanitizeUser(user) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    emailAddress: user.emailAddress
  };
}

async function createUser(payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);

  const existingUser = await findUserByEmail(payload.emailAddress);

  if (existingUser) {
    throw createError(409, 'An account with that email already exists.');
  }

  const user = {
    userId: `usr_${crypto.randomUUID()}`,
    fullName: payload.fullName,
    emailAddress: payload.emailAddress,
    passwordHash: createPasswordHash(payload.password),
    createdAt: new Date().toISOString()
  };

  await appendValues(USER_SHEET_NAME, [[
    user.userId,
    user.fullName,
    user.emailAddress,
    user.passwordHash,
    user.createdAt
  ]]);

  return user;
}

async function authenticateUser(payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);

  const user = await findUserByEmail(payload.emailAddress);

  if (!user || !verifyPassword(payload.password, user.passwordHash)) {
    throw createError(401, 'Invalid email or password.');
  }

  return user;
}

async function findUserByEmail(emailAddress) {
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);
  const rows = await readSheetRows(USER_SHEET_NAME);
  const [, ...dataRows] = rows;
  const matchIndex = dataRows.findIndex(
    (row) => String(row[2] || '').trim().toLowerCase() === emailAddress.toLowerCase()
  );

  if (matchIndex === -1) {
    return null;
  }

  const row = dataRows[matchIndex];

  return {
    userId: row[0] || '',
    fullName: row[1] || '',
    emailAddress: row[2] || '',
    passwordHash: row[3] || '',
    createdAt: row[4] || '',
    rowNumber: matchIndex + 2
  };
}

async function changeUserPassword(user, payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);

  const existingUser = await findUserByEmail(user.emailAddress);

  if (!existingUser) {
    throw createError(404, 'User not found.');
  }

  if (!verifyPassword(payload.currentPassword, existingUser.passwordHash)) {
    throw createError(401, 'Current password is incorrect.');
  }

  const nextHash = createPasswordHash(payload.newPassword);
  await updateRange(`${USER_SHEET_NAME}!D${existingUser.rowNumber}:D${existingUser.rowNumber}`, [[nextHash]]);
}

async function createPasswordRecovery(payload, headers = {}, protocol = 'https') {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);

  const user = await findUserByEmail(payload.emailAddress);

  if (!user) {
    return;
  }

  await ensureBaseSheet(PASSWORD_RESET_SHEET_NAME, PASSWORD_RESET_HEADERS);
  await revokeActiveResetTokensForEmail(user.emailAddress);

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashRecoveryToken(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const resetUrl = buildPasswordResetUrl(token, headers, protocol);

  await appendValues(PASSWORD_RESET_SHEET_NAME, [[
    tokenHash,
    user.emailAddress,
    expiresAt,
    '',
    createdAt
  ]]);

  await sendPasswordRecoveryEmail({
    fullName: user.fullName,
    emailAddress: user.emailAddress,
    resetUrl
  });
}

async function resetPasswordWithRecoveryToken(payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(USER_SHEET_NAME, USER_HEADERS);
  await ensureBaseSheet(PASSWORD_RESET_SHEET_NAME, PASSWORD_RESET_HEADERS);

  const recovery = await findPasswordResetRecordByToken(payload.token);

  if (!recovery || recovery.usedAt || new Date(recovery.expiresAt).getTime() < Date.now()) {
    throw createError(400, 'This recovery link is invalid or has expired.');
  }

  const user = await findUserByEmail(recovery.emailAddress);

  if (!user) {
    throw createError(404, 'User not found.');
  }

  const nextHash = createPasswordHash(payload.newPassword);
  await updateRange(`${USER_SHEET_NAME}!D${user.rowNumber}:D${user.rowNumber}`, [[nextHash]]);
  await updateRange(`${PASSWORD_RESET_SHEET_NAME}!D${recovery.rowNumber}:D${recovery.rowNumber}`, [[new Date().toISOString()]]);
}

async function revokeActiveResetTokensForEmail(emailAddress) {
  const tokens = await readSheetObjects(PASSWORD_RESET_SHEET_NAME);
  const activeRows = tokens.filter((row) => {
    const rowEmail = String(row['Email Address'] || '').trim().toLowerCase();
    const usedAt = String(row['Used At'] || '').trim();
    const expiresAt = String(row['Expires At'] || '').trim();
    return rowEmail === emailAddress.toLowerCase() && !usedAt && expiresAt && new Date(expiresAt).getTime() >= Date.now();
  });

  for (const row of activeRows) {
    const rowNumber = Number(row.__rowNumber || 0);

    if (rowNumber > 0) {
      await updateRange(`${PASSWORD_RESET_SHEET_NAME}!D${rowNumber}:D${rowNumber}`, [[new Date().toISOString()]]);
    }
  }
}

async function findPasswordResetRecordByToken(token) {
  const tokenHash = hashRecoveryToken(token);
  const tokens = await readSheetObjects(PASSWORD_RESET_SHEET_NAME);
  const match = tokens.find((row) => String(row['Token Hash'] || '') === tokenHash);

  if (!match) {
    return null;
  }

  return {
    tokenHash,
    emailAddress: String(match['Email Address'] || '').trim().toLowerCase(),
    expiresAt: String(match['Expires At'] || ''),
    usedAt: String(match['Used At'] || ''),
    createdAt: String(match['Created At'] || ''),
    rowNumber: Number(match.__rowNumber || 0)
  };
}

function hashRecoveryToken(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');
}

function buildPasswordResetUrl(token, headers = {}, protocol = 'https') {
  const env = getEnv();
  const baseUrl = env.appBaseUrl || `${protocol}://${headers.host || '127.0.0.1:8080'}`;
  return `${String(baseUrl).replace(/\/+$/, '')}/reset-password/${encodeURIComponent(token)}`;
}

async function sendPasswordRecoveryEmail({ fullName, emailAddress, resetUrl }) {
  const env = getEnv();

  if (!env.resendApiKey || !env.emailFrom) {
    console.warn(`Password recovery email not sent because RESEND_API_KEY or EMAIL_FROM is missing. Recovery link for ${emailAddress}: ${resetUrl}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [emailAddress],
      subject: 'Reset your GeneSys Event Admin password',
      html: renderPasswordRecoveryEmail({
        fullName,
        emailAddress,
        resetUrl
      })
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw createError(500, `Unable to send password recovery email: ${text}`);
  }
}

function renderPasswordRecoveryEmail({ fullName, resetUrl }) {
  const safeName = escapeHtml(fullName || 'there');
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#151823;">
      <p>Hello ${safeName},</p>
      <p>We received a request to reset your GeneSys Event Admin password.</p>
      <p><a href="${safeResetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#3d40f2;color:#ffffff;text-decoration:none;font-weight:700;">Reset password</a></p>
      <p>This link will expire in 30 minutes and can only be used once.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, expectedHash] = String(passwordHash || '').split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
}

async function createEvent(payload, user) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const eventId = createEventId(payload.eventType, payload.location, payload.dateTime);
  const publicSlug = createPublicEventSlug(payload.eventType, eventId);
  const eventLabel = buildEventLabel(payload.eventType, payload.location, payload.dateTime);
  const sheetSuffix = eventId.slice(-4).toUpperCase();
  const timestamp = new Date().toISOString();
  const rsvpSheetName = makeSafeSheetTitle(`${eventLabel} - RSVP - ${sheetSuffix}`);
  const attendanceSheetName = makeSafeSheetTitle(`${eventLabel} - Attendance - ${sheetSuffix}`);
  const event = {
    eventId,
    eventType: payload.eventType,
    eventLabel,
    location: payload.location,
    dateTime: payload.dateTime,
    rsvpSheetName,
    attendanceSheetName,
    createdBy: user.emailAddress,
    createdAt: timestamp,
    publicSlug,
    status: 'active',
    archivedAt: '',
    updatedAt: timestamp,
    rsvpAccepting: false,
    rsvpMaxYes: '',
    rsvpLimitRequired: true
  };

  await appendValues(EVENT_SHEET_NAME, [serializeEventRow(event)]);

  await ensureBaseSheet(event.rsvpSheetName, RSVP_HEADERS);
  await ensureBaseSheet(event.attendanceSheetName, ATTENDANCE_HEADERS);

  return decorateEvent(event);
}

async function listEvents() {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);
  const events = await readSheetObjects(EVENT_SHEET_NAME, {
    cacheTtlMs: CACHE_TTLS.events
  });

  return events
    .map((event) => decorateEvent(mapEventRow(event)))
    .filter((event) => !event.isDeleted)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function getEventById(eventId) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const event = await findEventRecordByIdentifier(eventId);

  if (!event || event.isDeleted) {
    throw createError(404, 'Event not found.');
  }

  return event;
}

function mapEventRow(row) {
  return {
    eventId: row['Event ID'],
    eventType: row['Event Type'],
    eventLabel: row['Event Label'],
    location: row['Location'],
    dateTime: row['Date Time'],
    rsvpSheetName: row['RSVP Sheet Name'],
    attendanceSheetName: row['Attendance Sheet Name'],
    createdBy: row['Created By'],
    createdAt: row['Created At'],
    publicSlug: row['Public Slug'] || '',
    status: row['Status'] || '',
    archivedAt: row['Archived At'] || '',
    updatedAt: row['Updated At'] || '',
    rsvpAccepting: normalizeBooleanSetting(row['RSVP Accepting'], true),
    rsvpMaxYes: normalizeOptionalPositiveInteger(row['RSVP Max Yes']),
    rsvpLimitRequired: normalizeBooleanSetting(row['RSVP Limit Required'], false),
    rowNumber: Number(row.__rowNumber || 0)
  };
}

function decorateEvent(event) {
  const publicSlug = event.publicSlug || buildPublicEventSlug(event);
  const status = normalizeStoredEventStatus(event.status);
  const isPast = isEventPast(event.dateTime);
  const isDeleted = status === 'deleted';
  const isManuallyArchived = status === 'archived';
  const isArchived = !isDeleted && (isManuallyArchived || isPast);
  const lifecycle = isDeleted ? 'deleted' : isArchived ? 'archived' : 'active';

  return {
    ...event,
    publicSlug,
    status,
    lifecycle,
    isPast,
    isDeleted,
    isArchived,
    isManuallyArchived,
    displayDateTime: formatDisplayDateTime(event.dateTime),
    rsvpPath: `/rsvp/${publicSlug}`,
    attendancePath: `/attendance/${publicSlug}`
  };
}

async function updateEvent(eventId, payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const existingEvent = await findEventRecordByIdentifier(eventId);

  if (!existingEvent || existingEvent.isDeleted) {
    throw createError(404, 'Event not found.');
  }

  const nextEvent = {
    ...existingEvent,
    publicSlug: existingEvent.publicSlug || createPublicEventSlug(existingEvent.eventType, existingEvent.eventId),
    updatedAt: new Date().toISOString()
  };

  let message = 'Event updated.';

  if (payload.action === 'archive') {
    nextEvent.status = 'archived';
    nextEvent.archivedAt = nextEvent.updatedAt;
    message = 'Event archived.';
  } else if (payload.action === 'unarchive') {
    nextEvent.status = 'active';
    nextEvent.archivedAt = '';
    message = isEventPast(nextEvent.dateTime)
      ? 'Archive flag removed. Move the event to a future date to make it active again.'
      : 'Event moved back to the active workspace.';
  } else if (payload.action === 'reschedule') {
    nextEvent.dateTime = payload.dateTime;
    nextEvent.eventLabel = buildEventLabel(nextEvent.eventType, nextEvent.location, nextEvent.dateTime);
    nextEvent.status = 'active';
    nextEvent.archivedAt = '';
    message = 'Event schedule updated.';
  } else if (payload.action === 'rsvp-settings') {
    if (existingEvent.rsvpLimitRequired && payload.rsvpAccepting && !payload.rsvpMaxYes) {
      throw badRequest('Set a max accepted Yes RSVP count before opening RSVP collection.');
    }

    nextEvent.rsvpAccepting = payload.rsvpAccepting;
    nextEvent.rsvpMaxYes = payload.rsvpMaxYes;
    nextEvent.rsvpLimitRequired = Boolean(existingEvent.rsvpLimitRequired);
    message = payload.rsvpAccepting ? 'RSVP collection settings saved.' : 'RSVP collection is closed.';
  }

  await saveEventRecord(nextEvent);

  return {
    event: decorateEvent(nextEvent),
    message
  };
}

async function deleteEvent(eventId) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const existingEvent = await findEventRecordByIdentifier(eventId);

  if (!existingEvent || existingEvent.isDeleted) {
    throw createError(404, 'Event not found.');
  }

  await saveEventRecord({
    ...existingEvent,
    status: 'deleted',
    updatedAt: new Date().toISOString()
  });
}

async function findEventRecordByIdentifier(eventId) {
  const events = await readSheetObjects(EVENT_SHEET_NAME, {
    cacheTtlMs: CACHE_TTLS.events
  });
  const normalizedIdentifier = String(eventId || '').trim();
  const row = events.find((event) => matchesEventIdentifier(event, normalizedIdentifier));

  return row ? decorateEvent(mapEventRow(row)) : null;
}

async function saveEventRecord(event) {
  if (!event.rowNumber) {
    throw createError(500, 'Unable to update this event because its sheet row is missing.');
  }

  const lastColumn = columnLetter(EVENT_HEADERS.length);
  await updateRange(
    `${EVENT_SHEET_NAME}!A${event.rowNumber}:${lastColumn}${event.rowNumber}`,
    [serializeEventRow(event)]
  );
}

function serializeEventRow(event) {
  return [
    event.eventId,
    event.eventType,
    event.eventLabel,
    event.location,
    event.dateTime,
    event.rsvpSheetName,
    event.attendanceSheetName,
    event.createdBy,
    event.createdAt,
    event.publicSlug || createPublicEventSlug(event.eventType, event.eventId),
    normalizeStoredEventStatus(event.status),
    event.archivedAt || '',
    event.updatedAt || event.createdAt || new Date().toISOString(),
    event.rsvpAccepting ? 'TRUE' : 'FALSE',
    event.rsvpMaxYes ? String(event.rsvpMaxYes) : '',
    event.rsvpLimitRequired ? 'TRUE' : 'FALSE'
  ];
}

function normalizeBooleanSetting(value, fallback) {
  const normalized = String(value === undefined || value === null ? '' : value).trim().toLowerCase();

  if (!normalized) {
    return Boolean(fallback);
  }

  return ['true', 'yes', '1', 'on'].includes(normalized);
}

function parseBooleanInput(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return normalizeBooleanSetting(value, false);
}

function normalizeOptionalPositiveInteger(value) {
  const normalized = String(value === undefined || value === null ? '' : value).trim();

  if (!normalized) {
    return '';
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== normalized) {
    return '';
  }

  return parsed;
}

async function getRsvpAvailability(event) {
  await ensureBaseSheet(event.rsvpSheetName, RSVP_HEADERS);

  const responses = await readSheetObjects(event.rsvpSheetName);
  const yesCount = responses.filter(
    (row) => String(row['Attendance Confirmation'] || '').trim() === RSVP_YES_VALUE
  ).length;
  const maxYes = normalizeOptionalPositiveInteger(event.rsvpMaxYes);
  const limitRequired = Boolean(event.rsvpLimitRequired);
  const accepting = Boolean(event.rsvpAccepting);
  const hasRequiredLimit = !limitRequired || Boolean(maxYes);
  const isFull = Boolean(maxYes) && yesCount >= maxYes;
  const canAccept = accepting && hasRequiredLimit && !isFull;
  let reason = 'open';
  let message = 'RSVP is open.';

  if (!accepting) {
    reason = 'closed';
    message = 'RSVP responses are not being accepted right now. Please contact your host for the next available schedule.';
  } else if (!hasRequiredLimit) {
    reason = 'limit-required';
    message = 'RSVP responses are not being accepted right now. Please contact your host for the next available schedule.';
  } else if (isFull) {
    reason = 'full';
    message = 'This RSVP list is already full. Please contact your host for the next available schedule.';
  }

  return {
    accepting,
    maxYes: maxYes || null,
    yesCount,
    limitRequired,
    isFull,
    canAccept,
    reason,
    message
  };
}

async function appendRsvp(event, payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(event.rsvpSheetName, RSVP_HEADERS);

  await appendValues(event.rsvpSheetName, [[
    new Date().toISOString(),
    event.eventId,
    event.eventType,
    event.eventLabel,
    event.location,
    event.dateTime,
    payload.fullName,
    payload.emailAddress,
    payload.mobileNumber,
    payload.profession,
    payload.invitedBy,
    payload.attendanceConfirmation
  ]]);
}

async function appendAttendance(event, payload) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(event.attendanceSheetName, ATTENDANCE_HEADERS);

  await appendValues(event.attendanceSheetName, [[
    new Date().toISOString(),
    event.eventId,
    event.eventType,
    event.eventLabel,
    event.location,
    event.dateTime,
    payload.fullName,
    payload.birthday,
    payload.mobileNumber,
    payload.emailAddress,
    payload.address,
    payload.profession
  ]]);
}

function createEventId(eventType, location, dateTime) {
  const typeSlug = slugify(eventType).slice(0, 12);
  const dateSlug = String(dateTime).slice(0, 10).replace(/-/g, '');
  const locationSlug = slugify(location).slice(0, 20);
  const shortId = crypto.randomBytes(3).toString('hex');
  return `${typeSlug}-${dateSlug}-${locationSlug}-${shortId}`;
}

function matchesEventIdentifier(row, identifier) {
  if (!identifier) {
    return false;
  }

  const event = mapEventRow(row);
  return (
    event.eventId === identifier ||
    (event.publicSlug || buildPublicEventSlug(event)) === identifier ||
    buildLegacyPublicEventSlug(event) === identifier
  );
}

function buildPublicEventSlug(event) {
  return event.publicSlug || createPublicEventSlug(event.eventType, event.eventId);
}

function createPublicEventSlug(eventType, eventId) {
  const typeCode = buildEventTypeCode(eventType);
  const uniqueCode = extractEventUniqueCode(eventId);

  return [typeCode, uniqueCode].filter(Boolean).join('-');
}

function buildLegacyPublicEventSlug(event) {
  const typeCode = buildEventTypeCode(event.eventType);
  const dateCode = String(event.dateTime || '').slice(0, 10).replace(/-/g, '');
  const uniqueCode = extractEventUniqueCode(event.eventId);

  return [typeCode, dateCode, uniqueCode].filter(Boolean).join('-');
}

function buildEventTypeCode(eventType) {
  const words = String(eventType || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!words || !words.length) {
    return 'evt';
  }

  if (words.length === 1) {
    return words[0].slice(0, 4);
  }

  return words
    .slice(0, 4)
    .map((word) => word[0])
    .join('');
}

function extractEventUniqueCode(eventId) {
  const parts = String(eventId || '')
    .split('-')
    .filter(Boolean);
  const lastPart = parts.length ? parts[parts.length - 1].toLowerCase() : '';

  if (/^[a-f0-9]{6,}$/.test(lastPart)) {
    return lastPart.slice(0, 6);
  }

  return crypto
    .createHash('sha1')
    .update(String(eventId || ''))
    .digest('hex')
    .slice(0, 6);
}

function normalizeStoredEventStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'archived' || normalized === 'deleted') {
    return normalized;
  }

  return 'active';
}

function isEventPast(dateTime) {
  const timestamp = new Date(dateTime).getTime();
  return !Number.isNaN(timestamp) && timestamp < Date.now();
}

function buildEventLabel(eventType, location, dateTime) {
  return `${eventType} - ${formatDisplayDateTime(dateTime)} - ${location}`;
}

function makeSafeSheetTitle(title) {
  const cleaned = String(title || '')
    .replace(/[\[\]\*\/\\\?\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, 99) || `Sheet ${Date.now()}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDisplayDateTime(dateTime) {
  const parsedDate = new Date(dateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateTime;
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsedDate);
}

function normalizeSignupPayload(body) {
  const fullName = String(body && body.fullName ? body.fullName : '').trim();
  const emailAddress = normalizeEmail(body && body.emailAddress ? body.emailAddress : '');
  const password = String(body && body.password ? body.password : '').trim();

  if (!fullName) {
    throw badRequest('Full name is required.');
  }

  if (!emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!password || password.length < 8) {
    throw badRequest('Password must be at least 8 characters.');
  }

  return { fullName, emailAddress, password };
}

function normalizeLoginPayload(body) {
  const emailAddress = normalizeEmail(body && body.emailAddress ? body.emailAddress : '');
  const password = String(body && body.password ? body.password : '').trim();

  if (!emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!password) {
    throw badRequest('Password is required.');
  }

  return { emailAddress, password };
}

function normalizeChangePasswordPayload(body) {
  const currentPassword = String(body && body.currentPassword ? body.currentPassword : '').trim();
  const newPassword = String(body && body.newPassword ? body.newPassword : '').trim();

  if (!currentPassword) {
    throw badRequest('Current password is required.');
  }

  if (!newPassword || newPassword.length < 8) {
    throw badRequest('Password must be at least 8 characters.');
  }

  return { currentPassword, newPassword };
}

function normalizeForgotPasswordPayload(body) {
  const emailAddress = normalizeEmail(body && body.emailAddress ? body.emailAddress : '');

  if (!emailAddress) {
    throw badRequest('Email address is required.');
  }

  return { emailAddress };
}

function normalizeResetPasswordPayload(body) {
  const token = String(body && body.token ? body.token : '').trim();
  const newPassword = String(body && body.newPassword ? body.newPassword : '').trim();

  if (!token) {
    throw badRequest('Recovery token is required.');
  }

  if (!newPassword || newPassword.length < 8) {
    throw badRequest('Password must be at least 8 characters.');
  }

  return { token, newPassword };
}

function normalizeEventPayload(body) {
  const eventType = String(body && body.eventType ? body.eventType : '').trim();
  const location = String(body && body.location ? body.location : '').trim();
  const dateTime = String(body && body.dateTime ? body.dateTime : '').trim();

  if (!EVENT_TYPES.includes(eventType)) {
    throw badRequest('Please select a valid event type.');
  }

  if (!location) {
    throw badRequest('Location is required.');
  }

  if (!dateTime) {
    throw badRequest('Date and time are required.');
  }

  return { eventType, location, dateTime };
}

function normalizeEventMutationPayload(body) {
  const action = String(body && body.action ? body.action : '').trim().toLowerCase();

  if (!['archive', 'unarchive', 'reschedule', 'rsvp-settings'].includes(action)) {
    throw badRequest('Please choose a valid event action.');
  }

  if (action === 'reschedule') {
    const dateTime = String(body && body.dateTime ? body.dateTime : '').trim();

    if (!dateTime) {
      throw badRequest('Select the new event date and time.');
    }

    return { action, dateTime };
  }

  if (action === 'rsvp-settings') {
    const rsvpAccepting = parseBooleanInput(body && body.rsvpAccepting);
    const rawMaxYes = String(body && body.rsvpMaxYes !== undefined ? body.rsvpMaxYes : '').trim();
    const rsvpMaxYes = rawMaxYes ? Number.parseInt(rawMaxYes, 10) : '';

    if (rawMaxYes && (!Number.isInteger(rsvpMaxYes) || rsvpMaxYes < 1 || String(rsvpMaxYes) !== rawMaxYes)) {
      throw badRequest('Max accepted Yes RSVPs must be a positive whole number.');
    }

    return {
      action,
      rsvpAccepting,
      rsvpMaxYes
    };
  }

  return { action };
}

function normalizeRsvpPayload(body) {
  const payload = {
    fullName: String(body && body.fullName ? body.fullName : '').trim(),
    emailAddress: normalizeEmail(body && body.emailAddress ? body.emailAddress : ''),
    mobileNumber: normalizePhilippineMobile(body && body.mobileNumber ? body.mobileNumber : ''),
    profession: String(body && body.profession ? body.profession : '').trim(),
    invitedBy: String(body && body.invitedBy ? body.invitedBy : '').trim(),
    attendanceConfirmation: String(
      body && body.attendanceConfirmation ? body.attendanceConfirmation : ''
    ).trim()
  };

  if (!payload.fullName) {
    throw badRequest('Full name is required.');
  }

  if (!payload.emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!payload.mobileNumber) {
    throw badRequest('Mobile number is required.');
  }

  if (!payload.profession || !PROFESSION_OPTIONS.includes(payload.profession)) {
    throw badRequest('Please select a profession from the list.');
  }

  if (!payload.invitedBy) {
    throw badRequest('Invited by is required.');
  }

  if (!['Yes, I will be attending', 'No, I cannot attend'].includes(payload.attendanceConfirmation)) {
    throw badRequest('Please choose your attendance confirmation.');
  }

  return payload;
}

function normalizeAttendancePayload(body) {
  const payload = {
    fullName: String(body && body.fullName ? body.fullName : '').trim(),
    birthday: String(body && body.birthday ? body.birthday : '').trim(),
    mobileNumber: normalizePhilippineMobile(body && body.mobileNumber ? body.mobileNumber : ''),
    emailAddress: normalizeEmail(body && body.emailAddress ? body.emailAddress : ''),
    address: String(body && body.address ? body.address : '').trim(),
    profession: String(body && body.profession ? body.profession : '').trim()
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

  if (!payload.emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!payload.address) {
    throw badRequest('Address is required.');
  }

  if (!payload.profession || !PROFESSION_OPTIONS.includes(payload.profession)) {
    throw badRequest('Please select a profession from the list.');
  }

  return payload;
}

function normalizeEmail(value) {
  const emailAddress = String(value || '').trim().toLowerCase();

  if (!emailAddress) {
    return '';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    throw badRequest('Enter a valid email address.');
  }

  return emailAddress;
}

function normalizePhilippineMobile(value) {
  const mobileNumber = String(value || '').trim();

  if (!mobileNumber) {
    return '';
  }

  const cleaned = mobileNumber.replace(/[\s-]/g, '');

  if (!/^(\+63|0)9\d{9}$/.test(cleaned)) {
    throw badRequest('Enter a valid Philippine mobile number.');
  }

  return cleaned;
}

function ensureGoogleSheetsConfigured() {
  if (!isGoogleSheetsConfigured()) {
    throw badRequest('Google Sheets is not configured yet. Add your sheet ID and service account credentials.');
  }
}

function isGoogleSheetsConfigured() {
  const env = getEnv();

  return Boolean(
    env.googleSheetId &&
      env.googleSheetId !== 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE' &&
      (env.googleServiceAccountFile || env.googleServiceAccountJson)
  );
}

async function ensureBaseSheet(sheetName, headers) {
  const cachedSheet = getCachedValue(ensuredSheetCache, sheetName);

  if (cachedSheet) {
    return;
  }

  const spreadsheet = await getSpreadsheetMetadata();
  let sheet = spreadsheet.sheets.find(
    (entry) => entry.properties && entry.properties.title === sheetName
  );

  if (!sheet) {
    const created = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${getEnv().googleSheetId}:batchUpdate`,
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
                  title: sheetName,
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

    sheet = created.replies[0].addSheet;
    invalidateSpreadsheetMetadataCache();
  }

  const rows = await readSheetRows(sheetName, {
    cacheTtlMs: CACHE_TTLS.rows
  });
  const existingHeaders = rows.length ? rows[0].map((value) => String(value || '').trim()) : [];
  const needsHeaderInit = rows.length === 0;
  const needsHeaderMigration =
    rows.length > 0 &&
    headers.some((header, index) => existingHeaders[index] !== header);

  if (needsHeaderInit || needsHeaderMigration) {
    await updateRange(`${sheetName}!A1:${columnLetter(headers.length)}1`, [headers]);

    if (sheet && sheet.properties && sheet.properties.sheetId !== undefined) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${getEnv().googleSheetId}:batchUpdate`,
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

  setCachedValue(ensuredSheetCache, sheetName, true, CACHE_TTLS.ensuredSheet);
}

async function getSpreadsheetMetadata() {
  const env = getEnv();
  const cached = spreadsheetMetadataCache.value && spreadsheetMetadataCache.expiresAt > Date.now();

  if (cached) {
    return spreadsheetMetadataCache.value;
  }

  const metadata = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetId}?fields=sheets.properties(sheetId,title,gridProperties.frozenRowCount)`
  );

  spreadsheetMetadataCache = {
    value: metadata,
    expiresAt: Date.now() + CACHE_TTLS.spreadsheetMetadata
  };

  return metadata;
}

async function appendValues(sheetName, rows) {
  const env = getEnv();
  const range = encodeURIComponent(`${sheetName}!A:${columnLetter(rows[0].length)}`);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  invalidateSheetDataCache(sheetName);
}

async function updateRange(range, rows) {
  const env = getEnv();
  const encodedRange = encodeURIComponent(range);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetId}/values/${encodedRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  invalidateSheetDataCache(extractSheetNameFromRange(range));
}

async function readSheetObjects(sheetName, options = {}) {
  const rows = await readSheetRows(sheetName, options);

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;

  return dataRows
    .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
    .map((row, index) => mapRowToObject(headers, row, index + 2));
}

async function readSheetRows(sheetName, options = {}) {
  const cacheTtlMs = Number(options.cacheTtlMs || 0);
  const cachedRows = cacheTtlMs > 0 ? getCachedValue(sheetRowsCache, sheetName) : null;

  if (cachedRows) {
    return cachedRows;
  }

  const env = getEnv();
  const range = encodeURIComponent(`${sheetName}!A:ZZ`);
  const response = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetId}/values/${range}`
  );
  const rows = Array.isArray(response.values) ? response.values : [];

  if (cacheTtlMs > 0) {
    setCachedValue(sheetRowsCache, sheetName, rows, cacheTtlMs);
  }

  return rows;
}

function getCachedValue(cache, key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedValue(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function invalidateSpreadsheetMetadataCache() {
  spreadsheetMetadataCache = {
    value: null,
    expiresAt: 0
  };
}

function invalidateSheetDataCache(sheetName) {
  if (!sheetName) {
    return;
  }

  sheetRowsCache.delete(sheetName);
  ensuredSheetCache.delete(sheetName);
}

function extractSheetNameFromRange(range) {
  return String(range || '').split('!')[0].trim();
}

function mapRowToObject(headers, row, rowNumber = 0) {
  return headers.reduce((accumulator, header, index) => {
    accumulator[header] = row[index] || '';
    accumulator.__rowNumber = rowNumber;
    return accumulator;
  }, {});
}

function columnLetter(index) {
  let value = index;
  let column = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
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
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    authSecret: process.env.AUTH_SECRET || '',
    appBaseUrl: process.env.APP_BASE_URL || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || ''
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  EVENT_TYPES,
  PROFESSION_OPTIONS,
  createError,
  handleApiRequest,
  loadEnvFile
};
