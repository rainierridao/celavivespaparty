const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/platform');

const {
  EVENT_HEADERS,
  mapEventRow,
  normalizeEventMutationPayload,
  sanitizePublicEvent,
  serializeEventRow
} = __test;

function roundTrip(event) {
  const values = serializeEventRow(event);
  const row = Object.fromEntries(EVENT_HEADERS.map((header, index) => [header, values[index]]));
  return mapEventRow(row);
}

test('rsvp settings carry a trimmed dress code', () => {
  const payload = normalizeEventMutationPayload({
    action: 'rsvp-settings',
    rsvpAccepting: true,
    rsvpMaxYes: '20',
    dressCode: '  All white, spa-ready  '
  });

  assert.equal(payload.dressCode, 'All white, spa-ready');
});

test('rsvp settings reject an overly long dress code', () => {
  assert.throws(() => normalizeEventMutationPayload({
    action: 'rsvp-settings',
    rsvpAccepting: false,
    dressCode: 'x'.repeat(301)
  }), /Dress code/);
});

test('dress code survives storage for Celavive Spa Party events only', () => {
  const celavive = roundTrip({ eventId: 'e1', eventType: 'Celavive Spa Party', dressCode: 'Pastel ✨' });
  const wellness = roundTrip({ eventId: 'e2', eventType: 'Wellness Wednesday', dressCode: 'Pastel ✨' });

  assert.equal(celavive.dressCode, 'Pastel ✨');
  assert.equal(wellness.dressCode, '');
});

test('the public RSVP page receives the dress code', () => {
  assert.equal(sanitizePublicEvent({ eventId: 'e1', dressCode: 'All white' }).dressCode, 'All white');
});
