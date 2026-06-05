const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INBODY_EVENT_TYPE = 'Wellness Assessment';
const LEGACY_INBODY_EVENT_TYPE = 'Free InBody Assessment';
const INBODY_EVENT_TYPES = [INBODY_EVENT_TYPE, LEGACY_INBODY_EVENT_TYPE];
const INBODY_MODES = ['raffle', 'booking'];
const CELAVIVE_RAFFLE_EVENT_TYPE = 'Celavive Spa Party - Raffle Entry';
const EVENT_TYPES = ['OPP', 'Celavive Spa Party', CELAVIVE_RAFFLE_EVENT_TYPE, INBODY_EVENT_TYPE];
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
const INBODY_RESPONSE_HEADERS = [
  'Timestamp',
  'Event ID',
  'Event Type',
  'Event Label',
  'Location',
  'Full Name',
  'Email Address',
  'Mobile Number',
  'Profession',
  'Invited By',
  'InBody Mode',
  'Slot ID',
  'Slot Label',
  'Booking Status',
  'Updated At'
];
const CELAVIVE_RAFFLE_RESPONSE_HEADERS = [
  'Timestamp',
  'Event ID',
  'Event Type',
  'Event Label',
  'Location',
  'Date Time',
  'Name',
  'Contact Number',
  'Email Address',
  'Profession',
  'Invited By',
  'Top Skin Concerns',
  'Skin Type',
  'Skincare Importance',
  'Buying Frequency',
  'Current Routine',
  'Monthly Spend',
  'Desired Result',
  'Premium Experience',
  'Willingness To Invest',
  'Personalized Experience Interest',
  'Prospect Score',
  'Prospect Tier'
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
  'RSVP Limit Required',
  'InBody Mode',
  'InBody Slots JSON',
  'InBody Response Sheet Name',
  'InBody Accepting',
  'Celavive Raffle Sheet Name'
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
const CELAVIVE_SKIN_CONCERN_OPTIONS = [
  'Dryness',
  'Dull or tired-looking skin',
  'Fine lines/wrinkles',
  'Acne or breakouts',
  'Dark spots/pigmentation',
  'Sensitive skin/redness',
  'Uneven skin tone',
  'Enlarged pores'
];
const CELAVIVE_SINGLE_CHOICE_OPTIONS = {
  skinType: ['Dry', 'Oily', 'Combination', 'Sensitive', 'I\u2019m not sure'],
  skincareImportance: ['Not a priority', 'Somewhat important', 'Important', 'Very important \u2014 I invest in skincare regularly'],
  buyingFrequency: ['Rarely', 'Every 3\u20136 months', 'Every few months', 'Monthly or regularly'],
  currentRoutine: ['Soap only', 'Basic routine (cleanser/moisturizer)', '3\u20134 step skincare routine', 'Multi-step skincare routine', 'I already invest in premium skincare'],
  monthlySpend: ['Below \u20b1500', '\u20b1500\u2013\u20b11,500', '\u20b11,500\u2013\u20b13,000', '\u20b13,000+'],
  desiredResult: ['Brighter/glowing skin', 'Hydration/moisture', 'Fewer fine lines', 'Clearer skin', 'Even skin tone', 'Firmer-looking skin'],
  premiumExperience: ['No, not yet', 'A few times', 'Yes, occasionally', 'Yes, regularly'],
  willingnessToInvest: ['Not right now', 'Maybe', 'Yes, if it fits my needs', 'Definitely'],
  personalizedExperienceInterest: ['Yes, definitely', 'Maybe', 'Not right now']
};

let tokenCache = {
  accessToken: '',
  expiresAt: 0
};
const CACHE_TTLS = {
  events: 30_000,
  users: 5 * 60_000,
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
    const events = await listEvents(user);

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
    const user = await requireUser(headers);
    const event = await getUserEventById(eventRouteMatch[1], user);
    const availability = await getRsvpAvailability(event);

    return response(200, {
      ok: true,
      event: {
        ...event,
        rsvpAvailability: availability,
        inBodyAvailability: await getInBodyAvailability(event),
        celaviveRaffleAvailability: await getCelaviveRaffleAvailability(event)
      }
    });
  }

  if (method === 'PATCH' && eventRouteMatch) {
    const user = await requireUser(headers);
    const payload = normalizeEventMutationPayload(body);
    const result = await updateEvent(eventRouteMatch[1], payload, user);

    return response(200, {
      ok: true,
      event: result.event,
      message: result.message
    });
  }

  if (method === 'DELETE' && eventRouteMatch) {
    const user = await requireUser(headers);
    await deleteEvent(eventRouteMatch[1], user);

    return response(200, {
      ok: true,
      message: 'Event deleted.'
    });
  }

  const rsvpResponseRouteMatch = route.match(/^\/events\/([^/]+)\/rsvp-responses$/);

  if (method === 'GET' && rsvpResponseRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(rsvpResponseRouteMatch[1], user);
    const responses = await readSheetObjects(event.rsvpSheetName);

    return response(200, {
      ok: true,
      event,
      responses
    });
  }

  const attendanceResponseRouteMatch = route.match(/^\/events\/([^/]+)\/attendance-responses$/);

  if (method === 'GET' && attendanceResponseRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(attendanceResponseRouteMatch[1], user);
    const responses = await readSheetObjects(event.attendanceSheetName);

    return response(200, {
      ok: true,
      event,
      responses
    });
  }

  const inBodyResponseRouteMatch = route.match(/^\/events\/([^/]+)\/inbody-responses$/);

  if (method === 'GET' && inBodyResponseRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(inBodyResponseRouteMatch[1], user);

    if (!isInBodyEvent(event)) {
      throw createError(404, 'InBody responses are not available for this event.');
    }

    const responses = await readSheetObjects(event.inBodyResponseSheetName);

    return response(200, {
      ok: true,
      event: {
        ...event,
        inBodyAvailability: await getInBodyAvailability(event)
      },
      responses
    });
  }

  const celaviveRaffleResponseRouteMatch = route.match(/^\/events\/([^/]+)\/celavive-raffle-responses$/);

  if (method === 'GET' && celaviveRaffleResponseRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(celaviveRaffleResponseRouteMatch[1], user);

    if (!isCelaviveRaffleEvent(event)) {
      throw createError(404, 'Celavive raffle responses are not available for this event.');
    }

    await ensureBaseSheet(event.celaviveRaffleSheetName, CELAVIVE_RAFFLE_RESPONSE_HEADERS, {
      force: true
    });
    const responses = await readSheetObjects(event.celaviveRaffleSheetName);

    return response(200, {
      ok: true,
      event,
      responses
    });
  }

  const inBodyResponseUpdateRouteMatch = route.match(/^\/events\/([^/]+)\/inbody-responses\/([^/]+)$/);

  if (method === 'PATCH' && inBodyResponseUpdateRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(inBodyResponseUpdateRouteMatch[1], user);
    const payload = normalizeInBodyResponseMutationPayload(body);
    const result = await updateInBodyBookingResponse(event, inBodyResponseUpdateRouteMatch[2], payload);

    return response(200, {
      ok: true,
      response: result.response,
      event: {
        ...event,
        inBodyAvailability: await getInBodyAvailability(event)
      },
      message: result.message
    });
  }

  const responseDeleteRouteMatch = route.match(/^\/events\/([^/]+)\/responses\/([^/]+)\/([^/]+)$/);

  if (method === 'DELETE' && responseDeleteRouteMatch) {
    const user = await requireUser(headers);
    const event = await getUserEventById(responseDeleteRouteMatch[1], user);
    const result = await deleteEventResponse(event, responseDeleteRouteMatch[2], responseDeleteRouteMatch[3]);

    return response(200, {
      ok: true,
      message: result.message
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
        rsvpAvailability: availability,
        inBodyAvailability: await getInBodyAvailability(event),
        celaviveRaffleAvailability: await getCelaviveRaffleAvailability(event)
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

  const inBodySubmitRouteMatch = route.match(/^\/events\/([^/]+)\/inbody$/);

  if (method === 'POST' && inBodySubmitRouteMatch) {
    const event = await getEventById(inBodySubmitRouteMatch[1]);
    const payload = normalizeInBodyPayload(body, event);
    await appendInBodyResponse(event, payload);

    return response(200, {
      ok: true,
      message: event.inBodyMode === 'booking'
        ? 'Wellness assessment booking saved successfully.'
        : 'InBody raffle entry saved successfully.'
    });
  }

  const celaviveRaffleSubmitRouteMatch = route.match(/^\/events\/([^/]+)\/celavive-raffle$/);

  if (method === 'POST' && celaviveRaffleSubmitRouteMatch) {
    const event = await getEventById(celaviveRaffleSubmitRouteMatch[1]);
    const payload = normalizeCelaviveRafflePayload(body);
    const availability = await getCelaviveRaffleAvailability(event);

    if (!availability || !availability.canAccept) {
      throw createError(409, availability ? availability.message : 'Celavive raffle entries are not available for this event.');
    }

    await appendCelaviveRaffleResponse(event, payload);

    return response(200, {
      ok: true,
      message: 'Your Celavive raffle entry has been submitted successfully.'
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
  const rows = await readSheetRows(USER_SHEET_NAME, {
    cacheTtlMs: CACHE_TTLS.users
  });
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
  const inBodyResponseSheetName = isInBodyEvent(payload)
    ? makeSafeSheetTitle(`${eventLabel} - InBody - ${sheetSuffix}`)
    : '';
  const celaviveRaffleSheetName = isCelaviveRaffleEvent(payload)
    ? makeSafeSheetTitle(`${eventLabel} - Raffle - ${sheetSuffix}`)
    : '';
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
    rsvpLimitRequired: true,
    inBodyMode: isInBodyEvent(payload) ? payload.inBodyMode : '',
    inBodySlots: isInBodyEvent(payload) ? payload.inBodySlots : [],
    inBodyResponseSheetName,
    inBodyAccepting: isInBodyEvent(payload),
    celaviveRaffleSheetName
  };

  await appendValues(EVENT_SHEET_NAME, [serializeEventRow(event)]);

  await ensureBaseSheet(event.rsvpSheetName, RSVP_HEADERS);
  await ensureBaseSheet(event.attendanceSheetName, ATTENDANCE_HEADERS);

  if (isInBodyEvent(event)) {
    await ensureBaseSheet(event.inBodyResponseSheetName, INBODY_RESPONSE_HEADERS);
  }

  if (isCelaviveRaffleEvent(event)) {
    await ensureBaseSheet(event.celaviveRaffleSheetName, CELAVIVE_RAFFLE_RESPONSE_HEADERS);
  }

  return decorateEvent(event);
}

async function listEvents(user) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);
  const events = await readSheetObjects(EVENT_SHEET_NAME, {
    cacheTtlMs: CACHE_TTLS.events
  });

  return (
    await Promise.all(
      events
        .map((event) => mapEventRow(event))
        .filter((event) => canAccessEvent(event, user))
        .map(async (event) => ensureEventResponseSheets(event))
    )
  )
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

  return ensureEventResponseSheets(event);
}

async function getUserEventById(eventId, user) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const event = await findEventRecordByIdentifier(eventId);

  if (!event || event.isDeleted || !canAccessEvent(event, user)) {
    throw createError(404, 'Event not found.');
  }

  return ensureEventResponseSheets(event);
}

function canAccessEvent(event, user) {
  const ownerEmail = normalizeOwnerEmail(event && event.createdBy);
  const userEmail = normalizeOwnerEmail(user && user.emailAddress);

  return Boolean(ownerEmail && userEmail && ownerEmail === userEmail);
}

function normalizeOwnerEmail(value) {
  return String(value || '').trim().toLowerCase();
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
    inBodyMode: String(row['InBody Mode'] || '').trim(),
    inBodySlots: parseInBodySlots(row['InBody Slots JSON']),
    inBodyResponseSheetName: row['InBody Response Sheet Name'] || '',
    inBodyAccepting: normalizeBooleanSetting(row['InBody Accepting'], true),
    celaviveRaffleSheetName: row['Celavive Raffle Sheet Name'] || '',
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
    attendancePath: `/attendance/${publicSlug}`,
    inBodyPath: isInBodyEvent(event) ? `/inbody/${publicSlug}` : '',
    celaviveRafflePath: isCelaviveRaffleEvent(event) ? `/celavive-raffle/${publicSlug}` : ''
  };
}

async function ensureEventResponseSheets(event) {
  if (!event || event.isDeleted) {
    return event;
  }

  const nextEvent = { ...event };
  const sheetSuffix = String(nextEvent.eventId || '').slice(-4).toUpperCase() || 'RESP';
  let shouldSave = false;

  if (!nextEvent.rsvpSheetName) {
    nextEvent.rsvpSheetName = makeSafeSheetTitle(`${nextEvent.eventLabel} - RSVP - ${sheetSuffix}`);
    shouldSave = true;
  }

  if (!nextEvent.attendanceSheetName || nextEvent.attendanceSheetName === nextEvent.rsvpSheetName) {
    nextEvent.attendanceSheetName = makeSafeSheetTitle(`${nextEvent.eventLabel} - Attendance - ${sheetSuffix}`);
    shouldSave = true;
  }

  if (isInBodyEvent(nextEvent) && !nextEvent.inBodyResponseSheetName) {
    nextEvent.inBodyResponseSheetName = makeSafeSheetTitle(`${nextEvent.eventLabel} - InBody - ${sheetSuffix}`);
    shouldSave = true;
  }

  if (isCelaviveRaffleEvent(nextEvent) && !nextEvent.celaviveRaffleSheetName) {
    nextEvent.celaviveRaffleSheetName = makeSafeSheetTitle(`${nextEvent.eventLabel} - Raffle - ${sheetSuffix}`);
    shouldSave = true;
  }

  if (shouldSave && nextEvent.rowNumber) {
    await saveEventRecord(nextEvent);
  }

  await ensureBaseSheet(nextEvent.rsvpSheetName, RSVP_HEADERS);
  await ensureBaseSheet(nextEvent.attendanceSheetName, ATTENDANCE_HEADERS);

  if (isInBodyEvent(nextEvent)) {
    await ensureBaseSheet(nextEvent.inBodyResponseSheetName, INBODY_RESPONSE_HEADERS);
  }

  if (isCelaviveRaffleEvent(nextEvent)) {
    await ensureBaseSheet(nextEvent.celaviveRaffleSheetName, CELAVIVE_RAFFLE_RESPONSE_HEADERS);
  }

  return decorateEvent(nextEvent);
}

async function updateEvent(eventId, payload, user) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const existingEvent = await findEventRecordByIdentifier(eventId);

  if (!existingEvent || existingEvent.isDeleted || !canAccessEvent(existingEvent, user)) {
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
  } else if (payload.action === 'celavive-entry-settings') {
    if (!isCelaviveRaffleEvent(existingEvent)) {
      throw badRequest('Entry settings are only available for Celavive raffle entry events.');
    }

    if (payload.rsvpAccepting && !payload.rsvpMaxYes) {
      throw badRequest('Set a max raffle entry count before opening entry collection.');
    }

    nextEvent.rsvpAccepting = payload.rsvpAccepting;
    nextEvent.rsvpMaxYes = payload.rsvpMaxYes;
    nextEvent.rsvpLimitRequired = true;
    message = payload.rsvpAccepting ? 'Entry collection settings saved.' : 'Entry collection is closed.';
  } else if (payload.action === 'inbody-settings') {
    if (!isInBodyEvent(existingEvent)) {
      throw badRequest('InBody settings are only available for Wellness Assessment events.');
    }

    nextEvent.inBodyAccepting = payload.inBodyAccepting;
    message = payload.inBodyAccepting ? 'InBody sign-ups are open.' : 'InBody sign-ups are locked.';
  }

  await saveEventRecord(nextEvent);

  return {
    event: decorateEvent(nextEvent),
    message
  };
}

async function deleteEvent(eventId, user) {
  ensureGoogleSheetsConfigured();
  await ensureBaseSheet(EVENT_SHEET_NAME, EVENT_HEADERS);

  const existingEvent = await findEventRecordByIdentifier(eventId);

  if (!existingEvent || existingEvent.isDeleted || !canAccessEvent(existingEvent, user)) {
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
    event.rsvpLimitRequired ? 'TRUE' : 'FALSE',
    isInBodyEvent(event) ? event.inBodyMode : '',
    isInBodyEvent(event) ? JSON.stringify(event.inBodySlots || []) : '',
    isInBodyEvent(event) ? event.inBodyResponseSheetName : '',
    isInBodyEvent(event) && event.inBodyAccepting ? 'TRUE' : 'FALSE',
    isCelaviveRaffleEvent(event) ? event.celaviveRaffleSheetName : ''
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

function isInBodyEvent(event) {
  return INBODY_EVENT_TYPES.includes(String(event && event.eventType ? event.eventType : '').trim());
}

function isCelaviveRaffleEvent(event) {
  return String(event && event.eventType ? event.eventType : '').trim() === CELAVIVE_RAFFLE_EVENT_TYPE;
}

function parseInBodySlots(value) {
  if (Array.isArray(value)) {
    return value.map((slot) => normalizeInBodySlot(slot)).filter(Boolean);
  }

  const raw = String(value || '').trim();

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((slot) => normalizeInBodySlot(slot)).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function normalizeInBodySlot(slot) {
  const date = String(slot && slot.date ? slot.date : '').trim();
  const endDate = String(slot && slot.endDate ? slot.endDate : date).trim();
  const startTime = String(slot && slot.startTime ? slot.startTime : '').trim();
  const endTime = String(slot && slot.endTime ? slot.endTime : '').trim();
  const capacity = Number.parseInt(String(slot && slot.capacity ? slot.capacity : '').trim(), 10);

  if (!date || !endDate || endDate < date || !startTime || !endTime || !Number.isInteger(capacity) || capacity < 1) {
    return null;
  }

  const slotId = String(slot && slot.slotId ? slot.slotId : createInBodySlotId(date, endDate, startTime, endTime)).trim();

  return {
    slotId,
    date,
    endDate,
    startTime,
    endTime,
    capacity,
    label: formatInBodySlotLabel({ date, endDate, startTime, endTime })
  };
}

function createInBodySlotId(date, endDate, startTime, endTime) {
  const source = `${date}-${endDate || date}-${startTime}-${endTime}-${crypto.randomBytes(2).toString('hex')}`;
  return `slot_${slugify(source).slice(0, 40)}`;
}

function formatInBodySlotLabel(slot) {
  const endDate = slot.endDate || slot.date;
  const dateLabel = endDate && endDate !== slot.date
    ? `${formatDisplayDate(slot.date)} - ${formatDisplayDate(endDate)}`
    : formatDisplayDate(slot.date);
  const startLabel = formatDisplayTime(slot.startTime);
  const endLabel = formatDisplayTime(slot.endTime);

  return `${dateLabel}, ${startLabel} - ${endLabel}`;
}

function formatDisplayDate(date) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function formatDisplayTime(time) {
  const parsedDate = new Date(`2000-01-01T${time}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return time;
  }

  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsedDate);
}

async function getInBodyAvailability(event) {
  if (!isInBodyEvent(event)) {
    return null;
  }

  await ensureBaseSheet(event.inBodyResponseSheetName, INBODY_RESPONSE_HEADERS);

  if (event.inBodyMode !== 'booking') {
    return {
      mode: event.inBodyMode || 'raffle',
      slots: []
    };
  }

  const responses = await readSheetObjects(event.inBodyResponseSheetName);
  const bookedCounts = responses.reduce((counts, row) => {
    const slotId = String(row['Slot ID'] || '').trim();
    const status = String(row['Booking Status'] || '').trim().toLowerCase();

    if (slotId && status !== 'cancelled') {
      counts[slotId] = (counts[slotId] || 0) + 1;
    }

    return counts;
  }, {});

  const slots = (event.inBodySlots || []).map((slot) => {
    const booked = bookedCounts[slot.slotId] || 0;
    const remaining = Math.max(0, slot.capacity - booked);

    return {
      ...slot,
      booked,
      remaining,
      isFull: remaining <= 0
    };
  });

  return {
    mode: 'booking',
    slots
  };
}

async function appendInBodyResponse(event, payload) {
  ensureGoogleSheetsConfigured();

  if (!isInBodyEvent(event)) {
    throw badRequest('This event does not accept InBody submissions.');
  }

  if (!event.inBodyAccepting) {
    throw createError(403, 'Wellness assessment sign-ups are locked right now. Please contact your host for the next available schedule.');
  }

  await ensureBaseSheet(event.inBodyResponseSheetName, INBODY_RESPONSE_HEADERS);

  let slotId = '';
  let slotLabel = '';
  let bookingStatus = event.inBodyMode === 'booking' ? 'Booked' : 'Raffle Entry';

  if (event.inBodyMode === 'booking') {
    const availability = await getInBodyAvailability(event);
    const slot = (availability.slots || []).find((item) => item.slotId === payload.slotId);

    if (!slot) {
      throw badRequest('Please choose an available wellness assessment schedule.');
    }

    if (slot.isFull) {
      throw createError(409, 'This wellness assessment schedule is already full. Please choose another slot.');
    }

    slotId = slot.slotId;
    slotLabel = slot.label;
  }

  const timestamp = new Date().toISOString();

  await appendValues(event.inBodyResponseSheetName, [[
    timestamp,
    event.eventId,
    event.eventType,
    event.eventLabel,
    event.location,
    payload.fullName,
    payload.emailAddress,
    payload.mobileNumber,
    payload.profession,
    payload.invitedBy,
    event.inBodyMode,
    slotId,
    slotLabel,
    bookingStatus,
    timestamp
  ]]);
}

async function appendCelaviveRaffleResponse(event, payload) {
  ensureGoogleSheetsConfigured();

  if (!isCelaviveRaffleEvent(event)) {
    throw badRequest('This event does not accept Celavive raffle submissions.');
  }

  await ensureBaseSheet(event.celaviveRaffleSheetName, CELAVIVE_RAFFLE_RESPONSE_HEADERS);

  const timestamp = new Date().toISOString();
  const score = calculateCelaviveProspectScore(payload);
  const tier = getCelaviveProspectTier(score);

  await appendValues(event.celaviveRaffleSheetName, [[
    timestamp,
    event.eventId,
    event.eventType,
    event.eventLabel,
    event.location,
    event.dateTime,
    payload.name,
    payload.contactNumber,
    payload.emailAddress,
    payload.profession,
    payload.invitedBy,
    payload.topSkinConcerns.join(', '),
    payload.skinType,
    payload.skincareImportance,
    payload.buyingFrequency,
    payload.currentRoutine,
    payload.monthlySpend,
    payload.desiredResult,
    payload.premiumExperience,
    payload.willingnessToInvest,
    payload.personalizedExperienceInterest,
    score,
    tier
  ]]);
}

function calculateCelaviveProspectScore(payload) {
  const optionScore = (field, value) => Math.max(0, CELAVIVE_SINGLE_CHOICE_OPTIONS[field].indexOf(value));
  const concernScore = Math.min(4, payload.topSkinConcerns.length);
  const personalizedScore = {
    'Yes, definitely': 3,
    Maybe: 1,
    'Not right now': 0
  }[payload.personalizedExperienceInterest] || 0;

  return (
    concernScore +
    optionScore('skincareImportance', payload.skincareImportance) +
    optionScore('buyingFrequency', payload.buyingFrequency) +
    optionScore('currentRoutine', payload.currentRoutine) +
    optionScore('monthlySpend', payload.monthlySpend) +
    optionScore('premiumExperience', payload.premiumExperience) +
    optionScore('willingnessToInvest', payload.willingnessToInvest) +
    personalizedScore
  );
}

function getCelaviveProspectTier(score) {
  if (score >= 18) {
    return 'Hot Prospect';
  }

  if (score >= 10) {
    return 'Warm Prospect';
  }

  return 'Light Prospect';
}

async function updateInBodyBookingResponse(event, rowNumberValue, payload) {
  ensureGoogleSheetsConfigured();

  if (!isInBodyEvent(event) || event.inBodyMode !== 'booking') {
    throw badRequest('Only InBody booking responses can be rescheduled.');
  }

  const rowNumber = Number.parseInt(String(rowNumberValue || '').trim(), 10);

  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw badRequest('Choose a valid booking response to reschedule.');
  }

  await ensureBaseSheet(event.inBodyResponseSheetName, INBODY_RESPONSE_HEADERS);
  const responses = await readSheetObjects(event.inBodyResponseSheetName);
  const existing = responses.find((row) => Number(row.__rowNumber || 0) === rowNumber);

  if (!existing) {
    throw createError(404, 'InBody booking response not found.');
  }

  const slots = event.inBodySlots || [];
  const nextSlot = slots.find((slot) => slot.slotId === payload.slotId);

  if (!nextSlot) {
    throw badRequest('Please choose a valid wellness assessment schedule.');
  }

  if (String(existing['Slot ID'] || '').trim() !== nextSlot.slotId) {
    const availability = await getInBodyAvailability(event);
    const availableSlot = (availability.slots || []).find((slot) => slot.slotId === nextSlot.slotId);

    if (!availableSlot || availableSlot.isFull) {
      throw createError(409, 'That wellness assessment schedule is already full.');
    }
  }

  const updatedAt = new Date().toISOString();
  const nextResponse = {
    ...existing,
    'Slot ID': nextSlot.slotId,
    'Slot Label': nextSlot.label,
    'Booking Status': 'Rescheduled',
    'Updated At': updatedAt
  };
  const lastColumn = columnLetter(INBODY_RESPONSE_HEADERS.length);

  await updateRange(`${event.inBodyResponseSheetName}!A${rowNumber}:${lastColumn}${rowNumber}`, [[
    existing['Timestamp'] || '',
    existing['Event ID'] || event.eventId,
    existing['Event Type'] || event.eventType,
    existing['Event Label'] || event.eventLabel,
    existing['Location'] || event.location,
    existing['Full Name'] || '',
    existing['Email Address'] || '',
    existing['Mobile Number'] || '',
    existing['Profession'] || '',
    existing['Invited By'] || '',
    existing['InBody Mode'] || event.inBodyMode,
    nextSlot.slotId,
    nextSlot.label,
    'Rescheduled',
    updatedAt
  ]]);

  return {
    response: nextResponse,
    message: 'InBody booking schedule updated.'
  };
}

async function deleteEventResponse(event, responseType, rowNumberValue) {
  ensureGoogleSheetsConfigured();
  const target = getResponseSheetTarget(event, responseType);
  const rowNumber = Number.parseInt(String(rowNumberValue || '').trim(), 10);

  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw badRequest('Choose a valid response entry to delete.');
  }

  await ensureBaseSheet(target.sheetName, target.headers);
  const responses = await readSheetObjects(target.sheetName);
  const existing = responses.find((row) => Number(row.__rowNumber || 0) === rowNumber);

  if (!existing) {
    throw createError(404, 'Response entry not found.');
  }

  await deleteSheetRow(target.sheetName, rowNumber);

  return {
    message: `${target.label} entry deleted.`
  };
}

function getResponseSheetTarget(event, responseType) {
  const normalized = String(responseType || '').trim().toLowerCase();

  if (normalized === 'rsvp') {
    return {
      sheetName: event.rsvpSheetName,
      headers: RSVP_HEADERS,
      label: 'RSVP'
    };
  }

  if (normalized === 'attendance') {
    return {
      sheetName: event.attendanceSheetName,
      headers: ATTENDANCE_HEADERS,
      label: 'Attendance'
    };
  }

  if (normalized === 'inbody') {
    if (!isInBodyEvent(event)) {
      throw badRequest('InBody responses are not available for this event.');
    }

    return {
      sheetName: event.inBodyResponseSheetName,
      headers: INBODY_RESPONSE_HEADERS,
      label: 'InBody'
    };
  }

  if (normalized === 'celavive-raffle') {
    if (!isCelaviveRaffleEvent(event)) {
      throw badRequest('Celavive raffle responses are not available for this event.');
    }

    return {
      sheetName: event.celaviveRaffleSheetName,
      headers: CELAVIVE_RAFFLE_RESPONSE_HEADERS,
      label: 'Celavive raffle'
    };
  }

  throw badRequest('Choose a valid response type.');
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

async function getCelaviveRaffleAvailability(event) {
  if (!isCelaviveRaffleEvent(event)) {
    return null;
  }

  await ensureBaseSheet(event.celaviveRaffleSheetName, CELAVIVE_RAFFLE_RESPONSE_HEADERS);

  const responses = await readSheetObjects(event.celaviveRaffleSheetName);
  const entryCount = responses.length;
  const maxEntries = normalizeOptionalPositiveInteger(event.rsvpMaxYes);
  const accepting = Boolean(event.rsvpAccepting);
  const hasRequiredLimit = Boolean(maxEntries);
  const isFull = Boolean(maxEntries) && entryCount >= maxEntries;
  const canAccept = accepting && hasRequiredLimit && !isFull;
  let reason = 'open';
  let message = 'Raffle entries are open.';

  if (!accepting) {
    reason = 'closed';
    message = 'Raffle entries are not being accepted right now. Please contact your host for the next available schedule.';
  } else if (!hasRequiredLimit) {
    reason = 'limit-required';
    message = 'Raffle entries are not being accepted right now. Please contact your host for the next available schedule.';
  } else if (isFull) {
    reason = 'full';
    message = 'This raffle entry list is already full. Please contact your host for the next available schedule.';
  }

  return {
    accepting,
    maxEntries: maxEntries || null,
    entryCount,
    limitRequired: true,
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

  if (!INBODY_EVENT_TYPES.includes(eventType)) {
    return { eventType, location, dateTime };
  }

  const inBodyMode = String(body && body.inBodyMode ? body.inBodyMode : '').trim().toLowerCase();

  if (!INBODY_MODES.includes(inBodyMode)) {
    throw badRequest('Please choose a valid InBody workflow.');
  }

  const inBodySlots = inBodyMode === 'booking'
    ? normalizeInBodySlotsInput(body && body.inBodySlots)
    : [];

  if (inBodyMode === 'booking' && !inBodySlots.length) {
    throw badRequest('Add at least one wellness assessment schedule slot.');
  }

  return { eventType, location, dateTime, inBodyMode, inBodySlots };
}

function normalizeInBodySlotsInput(value) {
  if (!Array.isArray(value)) {
    throw badRequest('InBody schedule slots must be submitted as a list.');
  }

  const slots = value.map((slot) => normalizeInBodySlot(slot)).filter(Boolean);
  const slotIds = new Set();

  for (const slot of slots) {
    if (slotIds.has(slot.slotId)) {
      slot.slotId = createInBodySlotId(slot.date, slot.endDate, slot.startTime, slot.endTime);
    }

    slotIds.add(slot.slotId);
  }

  return slots;
}

function normalizeEventMutationPayload(body) {
  const action = String(body && body.action ? body.action : '').trim().toLowerCase();

  if (!['archive', 'unarchive', 'reschedule', 'rsvp-settings', 'celavive-entry-settings', 'inbody-settings'].includes(action)) {
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

  if (action === 'celavive-entry-settings') {
    const rsvpAccepting = parseBooleanInput(body && body.rsvpAccepting);
    const rawMaxYes = String(body && body.rsvpMaxYes !== undefined ? body.rsvpMaxYes : '').trim();
    const rsvpMaxYes = rawMaxYes ? Number.parseInt(rawMaxYes, 10) : '';

    if (rawMaxYes && (!Number.isInteger(rsvpMaxYes) || rsvpMaxYes < 1 || String(rsvpMaxYes) !== rawMaxYes)) {
      throw badRequest('Max raffle entries must be a positive whole number.');
    }

    return {
      action,
      rsvpAccepting,
      rsvpMaxYes
    };
  }

  if (action === 'inbody-settings') {
    return {
      action,
      inBodyAccepting: parseBooleanInput(body && body.inBodyAccepting)
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

function normalizeInBodyPayload(body, event) {
  const payload = {
    fullName: String(body && body.fullName ? body.fullName : '').trim(),
    emailAddress: normalizeEmail(body && body.emailAddress ? body.emailAddress : ''),
    mobileNumber: normalizePhilippineMobile(body && body.mobileNumber ? body.mobileNumber : ''),
    profession: String(body && body.profession ? body.profession : '').trim(),
    invitedBy: String(body && body.invitedBy ? body.invitedBy : '').trim(),
    slotId: String(body && body.slotId ? body.slotId : '').trim()
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

  if (event && event.inBodyMode === 'booking' && !payload.slotId) {
    throw badRequest('Please choose a wellness assessment schedule.');
  }

  return payload;
}

function normalizeCelaviveRafflePayload(body) {
  const payload = {
    name: String(body && body.name ? body.name : '').trim(),
    contactNumber: normalizePhilippineMobile(body && body.contactNumber ? body.contactNumber : ''),
    emailAddress: normalizeEmail(body && body.emailAddress ? body.emailAddress : ''),
    profession: String(body && body.profession ? body.profession : '').trim(),
    invitedBy: String(body && body.invitedBy ? body.invitedBy : '').trim(),
    topSkinConcerns: normalizeCelaviveMultiChoice(body && body.topSkinConcerns, CELAVIVE_SKIN_CONCERN_OPTIONS, 'Choose at least one top skin concern.'),
    skinType: normalizeCelaviveSingleChoice(body && body.skinType, 'skinType', 'Choose your skin type.'),
    skincareImportance: normalizeCelaviveSingleChoice(body && body.skincareImportance, 'skincareImportance', 'Choose how important skincare is to you.'),
    buyingFrequency: normalizeCelaviveSingleChoice(body && body.buyingFrequency, 'buyingFrequency', 'Choose how often you buy skincare products.'),
    currentRoutine: normalizeCelaviveSingleChoice(body && body.currentRoutine, 'currentRoutine', 'Choose your current skincare routine.'),
    monthlySpend: normalizeCelaviveSingleChoice(body && body.monthlySpend, 'monthlySpend', 'Choose your monthly skincare or self-care spend.'),
    desiredResult: normalizeCelaviveSingleChoice(body && body.desiredResult, 'desiredResult', 'Choose the skincare result you would love to improve most.'),
    premiumExperience: normalizeCelaviveSingleChoice(body && body.premiumExperience, 'premiumExperience', 'Choose whether you have tried professional or premium skincare before.'),
    willingnessToInvest: normalizeCelaviveSingleChoice(body && body.willingnessToInvest, 'willingnessToInvest', 'Choose whether you would consider investing in a skincare regimen.'),
    personalizedExperienceInterest: normalizeCelaviveSingleChoice(body && body.personalizedExperienceInterest, 'personalizedExperienceInterest', 'Choose whether you are interested in a personalized full skincare experience.')
  };

  if (!payload.contactNumber) {
    throw badRequest('Contact number is required.');
  }

  if (!payload.emailAddress) {
    throw badRequest('Email address is required.');
  }

  if (!payload.profession || !PROFESSION_OPTIONS.includes(payload.profession)) {
    throw badRequest('Please select a profession from the list.');
  }

  if (!payload.invitedBy) {
    throw badRequest('Invited by is required.');
  }

  return payload;
}

function normalizeCelaviveMultiChoice(value, options, message) {
  const selected = Array.isArray(value) ? value : [];
  const normalized = selected.map((item) => String(item || '').trim()).filter(Boolean);

  if (!normalized.length) {
    throw badRequest(message);
  }

  const unique = [...new Set(normalized)];

  if (unique.some((item) => !options.includes(item))) {
    throw badRequest('Choose only valid Celavive questionnaire options.');
  }

  return unique;
}

function normalizeCelaviveSingleChoice(value, field, message) {
  const normalized = String(value || '').trim();
  const options = CELAVIVE_SINGLE_CHOICE_OPTIONS[field] || [];

  if (!normalized) {
    throw badRequest(message);
  }

  if (!options.includes(normalized)) {
    throw badRequest('Choose only valid Celavive questionnaire options.');
  }

  return normalized;
}

function normalizeInBodyResponseMutationPayload(body) {
  const slotId = String(body && body.slotId ? body.slotId : '').trim();

  if (!slotId) {
    throw badRequest('Please choose the new wellness assessment schedule.');
  }

  return { slotId };
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

async function ensureBaseSheet(sheetName, headers, options = {}) {
  const shouldForceHeaderCheck = Boolean(options.force);
  const cachedSheet = getCachedValue(ensuredSheetCache, sheetName);

  if (cachedSheet && !shouldForceHeaderCheck) {
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

    invalidateSheetDataCache(sheetName);
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

async function deleteSheetRow(sheetName, rowNumber) {
  const spreadsheet = await getSpreadsheetMetadata();
  const sheet = spreadsheet.sheets.find(
    (entry) => entry.properties && entry.properties.title === sheetName
  );

  if (!sheet || sheet.properties.sheetId === undefined) {
    throw createError(404, 'Response sheet not found.');
  }

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
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber
              }
            }
          }
        ]
      })
    }
  );

  invalidateSheetDataCache(sheetName);
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

    if (
      errorInfo &&
      (errorInfo.reason === 'RATE_LIMIT_EXCEEDED' ||
        errorInfo.reason === 'QUOTA_EXCEEDED' ||
        errorInfo.reason === 'RESOURCE_EXHAUSTED')
    ) {
      return createError(
        429,
        'Google Sheets is temporarily rate-limiting this app. Please wait about a minute, then try again.'
      );
    }

    if (/quota|rate limit|read requests/i.test(message)) {
      return createError(
        429,
        'Google Sheets is temporarily rate-limiting this app. Please wait about a minute, then try again.'
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
