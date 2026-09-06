const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/platform');

const validConfig = {
  enabled: true,
  title: 'Spin to Win',
  winChance: 65,
  losingLabel: 'Thank you for playing',
  losingColor: '#7457d9',
  losingSliceCount: 6,
  losingVisualChance: 20,
  prizes: [
    { id: 'prize_one', label: 'Prize One', color: '#e05a9d', quantity: 2, chance: 60, visualSliceCount: 3 },
    { id: 'prize_two', label: 'Prize Two', color: '#f2a83b', quantity: 3, chance: 40, visualSliceCount: 2 }
  ]
};

test('accepts prize shares totaling 100 percent of the winning pool', () => {
  const config = __test.normalizeWellnessRaffleConfig(validConfig);
  assert.equal(config.enabled, true);
  assert.equal(config.winChance, 65);
  assert.equal(config.losingSliceCount, 6);
  assert.equal(config.losingVisualChance, 20);
  assert.deepEqual(config.prizes.map((prize) => prize.visualSliceCount), [3, 2]);
  assert.equal(config.prizes.reduce((sum, prize) => sum + prize.chance, 0), 100);
});

test('accepts automatic losing slice count for existing configs', () => {
  const { losingSliceCount, losingVisualChance, winChance, ...legacyConfig } = validConfig;
  const config = __test.normalizeWellnessRaffleConfig(legacyConfig);
  assert.equal(config.winChance, 65);
  assert.equal(config.losingSliceCount, 0);
  assert.equal(config.losingVisualChance, 35);
});

test('accepts custom winning rates', () => {
  const config = __test.normalizeWellnessRaffleConfig({
    ...validConfig,
    winChance: 75,
    losingVisualChance: 20
  });
  assert.equal(config.winChance, 75);
});

test('rejects invalid winning rates', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({ ...validConfig, winChance: 100 }),
    /Winning rate/
  );
});

test('rejects invalid losing slice counts', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({ ...validConfig, losingSliceCount: 25 }),
    /slice count/
  );
});

test('rejects invalid losing visual sizes', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({ ...validConfig, losingVisualChance: 40 }),
    /visual size/
  );
});

test('defaults missing prize visual slice counts to one', () => {
  const config = __test.normalizeWellnessRaffleConfig({
    ...validConfig,
    prizes: validConfig.prizes.map(({ visualSliceCount, ...prize }) => prize)
  });
  assert.deepEqual(config.prizes.map((prize) => prize.visualSliceCount), [1, 1]);
});

test('rejects invalid prize visual slice counts', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({
      ...validConfig,
      prizes: [{ ...validConfig.prizes[0], chance: 100, visualSliceCount: 0 }]
    }),
    /wheel slices/
  );
});

test('rejects prize shares that do not total 100 percent', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({
      ...validConfig,
      prizes: validConfig.prizes.map((prize) => ({ ...prize, chance: 10 }))
    }),
    /total exactly 100%/
  );
});

test('rejects invalid quantities and colors', () => {
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({
      ...validConfig,
      prizes: [{ ...validConfig.prizes[0], quantity: 0, chance: 100 }]
    }),
    /positive whole number/
  );
  assert.throws(
    () => __test.normalizeWellnessRaffleConfig({ ...validConfig, losingColor: 'purple' }),
    /six-digit hex color/
  );
});

test('counts only recorded winning prize awards', () => {
  const counts = __test.countWellnessPrizeAwards([
    { Outcome: 'Win', 'Prize ID': 'prize_one' },
    { Outcome: 'Lose', 'Prize ID': '' },
    { Outcome: 'Win', 'Prize ID': 'prize_one' },
    { Outcome: 'Win', 'Prize ID': 'prize_two' }
  ]);
  assert.deepEqual(counts, { prize_one: 2, prize_two: 1 });
});

test('falls back safely for missing legacy configuration', () => {
  const config = __test.parseWellnessRaffleConfig('');
  assert.equal(config.enabled, false);
  assert.deepEqual(config.prizes, []);
});

test('migrates legacy 40-point prize weights to a 100 percent distribution', () => {
  const legacy = {
    ...validConfig,
    prizes: [
      { ...validConfig.prizes[0], chance: 25 },
      { ...validConfig.prizes[1], chance: 15 }
    ]
  };
  const config = __test.parseWellnessRaffleConfig(JSON.stringify(legacy));
  assert.deepEqual(config.prizes.map((prize) => prize.chance), [62.5, 37.5]);
});

test('public event sanitization removes internal raffle storage fields', () => {
  const event = __test.sanitizePublicEvent({
    eventId: 'event-1',
    rowNumber: 4,
    celaviveSurveySheetName: 'Internal Survey',
    wellnessRaffleConfig: validConfig,
    wellnessRaffleSpinSheetName: 'Internal Spins'
  });
  assert.deepEqual(event, { eventId: 'event-1' });
});

test('normalizes valid Celavive activity survey payloads', () => {
  const payload = __test.normalizeCelaviveSurveyPayload({
    fullName: '  Jane Guest  ',
    mobileNumber: '09171234567',
    emailAddress: ' JANE@EXAMPLE.COM ',
    profession: 'Teacher',
    invitedBy: 'Host Name',
    futureActivities: ['Yoga', 'Yoga', 'Zumba Nights']
  });

  assert.equal(payload.fullName, 'Jane Guest');
  assert.equal(payload.mobileNumber, '09171234567');
  assert.equal(payload.emailAddress, 'jane@example.com');
  assert.deepEqual(payload.futureActivities, ['Yoga', 'Zumba Nights']);
});

test('rejects invalid Celavive activity survey payloads', () => {
  const validPayload = {
    fullName: 'Jane Guest',
    mobileNumber: '09171234567',
    emailAddress: 'jane@example.com',
    profession: 'Teacher',
    invitedBy: 'Host Name',
    futureActivities: ['Yoga']
  };

  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, mobileNumber: '' }), /Mobile number/);
  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, emailAddress: '' }), /Email address/);
  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, profession: '' }), /profession/);
  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, invitedBy: '' }), /Invited by/);
  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, futureActivities: [] }), /future activity/);
  assert.throws(() => __test.normalizeCelaviveSurveyPayload({ ...validPayload, futureActivities: ['Skydiving'] }), /valid Celavive questionnaire options/);
});

test('decorates only Celavive spa party events with survey paths', () => {
  const baseEvent = {
    eventId: 'event-1',
    eventType: 'Celavive Spa Party',
    eventLabel: 'Celavive Spa Party - Makati',
    dateTime: '2026-09-06T10:00:00.000Z',
    publicSlug: 'celavive-event-1'
  };

  assert.equal(__test.decorateEvent(baseEvent).celaviveSurveyPath, '/celavive-survey/celavive-event-1');
  assert.equal(__test.decorateEvent({ ...baseEvent, eventType: 'Wellness Wednesday' }).celaviveSurveyPath, '');
  assert.equal(__test.decorateEvent({ ...baseEvent, eventType: 'Celavive Spa Party - Raffle Entry' }).celaviveSurveyPath, '');
});

test('defaults RSVP collection to open for Celavive spa party events', () => {
  assert.equal(__test.getDefaultRsvpAccepting('Celavive Spa Party'), true);
  assert.equal(__test.getDefaultRsvpAccepting('Beauty Caravan'), false);
});

test('detects Firebase split credentials for Netlify functions', () => {
  const previousEnv = { ...process.env };

  try {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.FIREBASE_PROJECT_ID = 'genesys-events-887e4';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@example.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';

    assert.equal(__test.isFirebaseConfigured(), true);
  } finally {
    process.env = previousEnv;
  }
});
