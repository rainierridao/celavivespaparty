const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/platform');

const {
  buildMasterlistSharePath,
  buildSharedMasterlistColumns,
  decorateEvent,
  normalizeEventMutationPayload,
  parseMasterlistShare,
  sanitizePublicEvent
} = __test;

const TOKEN = 'a'.repeat(32);

test('parses stored masterlist share settings', () => {
  assert.deepEqual(parseMasterlistShare(''), {
    enabled: false,
    token: '',
    allowMarkPaid: true,
    createdAt: ''
  });

  const stored = parseMasterlistShare(
    JSON.stringify({ enabled: true, token: TOKEN, allowMarkPaid: false, createdAt: '2026-01-01T00:00:00.000Z' })
  );
  assert.equal(stored.enabled, true);
  assert.equal(stored.token, TOKEN);
  assert.equal(stored.allowMarkPaid, false);

  // A share flagged on without a token is not shared at all.
  assert.equal(parseMasterlistShare(JSON.stringify({ enabled: true })).enabled, false);
});

test('only a special event with sharing on gets a masterlist path', () => {
  const share = { enabled: true, token: TOKEN, allowMarkPaid: true, createdAt: '' };

  assert.equal(
    buildMasterlistSharePath({ eventType: 'Special Event', masterlistShare: share }),
    `/masterlist/${TOKEN}`
  );
  assert.equal(buildMasterlistSharePath({ eventType: 'OPP', masterlistShare: share }), '');
  assert.equal(
    buildMasterlistSharePath({ eventType: 'Special Event', masterlistShare: { ...share, enabled: false } }),
    ''
  );
});

test('the share token never rides along on a public event payload', () => {
  const event = decorateEvent({
    eventId: 'evt_1',
    eventType: 'Special Event',
    eventLabel: 'Special Event - Hall',
    location: 'Hall',
    dateTime: '2030-01-01T10:00',
    specialEventName: 'GeneSys Circle',
    masterlistShare: { enabled: true, token: TOKEN, allowMarkPaid: true, createdAt: '' }
  });

  assert.equal(event.masterlistSharePath, `/masterlist/${TOKEN}`);

  const publicEvent = sanitizePublicEvent(event);
  assert.equal(publicEvent.masterlistShare, undefined);
  assert.equal(publicEvent.masterlistSharePath, undefined);
  assert.ok(!JSON.stringify(publicEvent).includes(TOKEN));
});

test('shared masterlist columns drop internal fields and hide payment columns when unused', () => {
  const responses = [
    {
      __rowNumber: 2,
      Timestamp: '2026-01-01T00:00:00.000Z',
      'Event ID': 'evt_1',
      'Event Type': 'Special Event',
      'Event Label': 'Special Event - Hall',
      Location: 'Hall',
      'Date Time': '2030-01-01T10:00',
      'Full Name': 'Ana',
      'Payment Reference': 'AB12-CD34',
      'Payment Method': 'GCash',
      'Payment Email': 'ana@example.com',
      'Payment Amount': 'PHP 500.00',
      'Payment Status': 'Pending',
      'Paid At': ''
    }
  ];

  assert.deepEqual(buildSharedMasterlistColumns(responses, true), [
    'Timestamp',
    'Full Name',
    'Payment Reference',
    'Payment Method',
    'Payment Email',
    'Payment Amount',
    'Payment Status',
    'Paid At'
  ]);
  assert.deepEqual(buildSharedMasterlistColumns(responses, false), ['Timestamp', 'Full Name']);
  assert.deepEqual(buildSharedMasterlistColumns([], true), []);
});

test('normalizes the masterlist share action', () => {
  assert.deepEqual(
    normalizeEventMutationPayload({
      action: 'masterlist-share',
      enabled: true,
      allowMarkPaid: false,
      regenerate: 'true'
    }),
    { action: 'masterlist-share', enabled: true, allowMarkPaid: false, regenerate: true }
  );

  assert.throws(() => normalizeEventMutationPayload({ action: 'masterlist-shared' }), /valid event action/);
});
