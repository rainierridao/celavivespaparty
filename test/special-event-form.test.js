const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/platform');

const {
  buildSpecialFormColumns,
  decorateEvent,
  isSpecialEvent,
  normalizeEventPayload,
  normalizeSpecialFormDefinition,
  normalizeSpecialFormSubmission
} = __test;

function buildForm(fields) {
  return normalizeSpecialFormDefinition({ fields });
}

test('normalizes a mixed special event form definition', () => {
  const form = buildForm([
    { type: 'heading', label: 'Program Flow' },
    { type: 'short-text', label: 'Full Name', required: true },
    { type: 'checkbox', label: 'Sessions', options: ['Morning', 'Afternoon', 'Morning'] },
    { type: 'rating', label: 'How was it?', ratingMax: 5 },
    { type: 'image', imageDataUrl: 'data:image/png;base64,AAAA' }
  ]);

  assert.equal(form.fields.length, 5);
  assert.equal(form.submitLabel, 'Submit');
  // Duplicate choices collapse, case-insensitively.
  assert.deepEqual(form.fields[2].options, ['Morning', 'Afternoon']);
  assert.equal(form.fields[3].ratingMax, 5);
  assert.equal(form.fields[4].imageDataUrl, 'data:image/png;base64,AAAA');
  assert.ok(form.fields.every((field) => field.fieldId));
});

test('rejects malformed special event form blocks', () => {
  assert.throws(() => buildForm([{ type: 'nonsense', label: 'x' }]), /unsupported type \("nonsense"\)/);
  assert.throws(() => buildForm([{ type: 'short-text', label: '   ' }]), /needs a question or heading/);
  assert.throws(
    () => buildForm([{ type: 'multiple-choice', label: 'Pick', options: ['Only one'] }]),
    /at least two choices/
  );
  assert.throws(() => buildForm([{ type: 'image' }]), /no picture uploaded/);
  assert.throws(
    () => buildForm([{ type: 'image', imageDataUrl: 'https://example.com/photo.png' }]),
    /PNG, JPG, GIF, or WebP/
  );
});

test('builds response columns only for answerable blocks and de-duplicates labels', () => {
  const form = buildForm([
    { type: 'heading', label: 'Welcome' },
    { type: 'image', imageDataUrl: 'data:image/jpeg;base64,AAAA' },
    { type: 'short-text', label: 'Name' },
    { type: 'short-text', label: 'Name' },
    { type: 'short-text', label: 'Location' }
  ]);
  const columns = buildSpecialFormColumns(form).map((entry) => entry.column);

  // 'Location' collides with a reserved base header, so it is suffixed too.
  assert.deepEqual(columns, ['Name', 'Name (2)', 'Location (2)']);
});

test('validates a submitted special event form response', () => {
  const form = buildForm([
    { type: 'short-text', label: 'Full Name', required: true },
    { type: 'checkbox', label: 'Sessions', options: ['Morning', 'Afternoon'] },
    { type: 'poll', label: 'Venue', options: ['Hall A', 'Hall B'] },
    { type: 'rating', label: 'Score', ratingMax: 5 },
    { type: 'email', label: 'Email' }
  ]);
  const event = { eventType: 'Special Event', specialForm: form };
  const [name, sessions, venue, score, email] = form.fields;

  const result = normalizeSpecialFormSubmission(
    {
      answers: {
        [name.fieldId]: '  Mary  ',
        [sessions.fieldId]: ['Morning', 'Afternoon'],
        [venue.fieldId]: 'Hall B',
        [score.fieldId]: '4',
        [email.fieldId]: 'mary@example.com'
      }
    },
    event
  );

  assert.deepEqual(result.answers, {
    'Full Name': 'Mary',
    Sessions: 'Morning, Afternoon',
    Venue: 'Hall B',
    Score: '4',
    Email: 'mary@example.com'
  });

  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { [sessions.fieldId]: ['Morning'] } }, event),
    /"Full Name" is required/
  );
  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { [name.fieldId]: 'Mary', [venue.fieldId]: 'Hall C' } }, event),
    /Choose a valid option for "Venue"/
  );
  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { [name.fieldId]: 'Mary', [score.fieldId]: '9' } }, event),
    /between 1 and 5/
  );
  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { [name.fieldId]: 'Mary', [email.fieldId]: 'not-an-email' } }, event),
    /valid email address/
  );
});

test('special event payloads require a name and accept a form', () => {
  const payload = normalizeEventPayload({
    eventType: 'Special Event',
    location: 'Mallberry Suites',
    dateTime: '2026-10-01T18:00',
    specialEventName: '  GeneSys   Circle ',
    specialForm: { fields: [{ type: 'short-text', label: 'Full Name' }] }
  });

  assert.equal(payload.specialEventName, 'GeneSys Circle');
  assert.equal(payload.specialForm.fields.length, 1);
  assert.ok(isSpecialEvent(payload));

  assert.throws(
    () => normalizeEventPayload({
      eventType: 'Special Event',
      location: 'Mallberry Suites',
      dateTime: '2026-10-01T18:00'
    }),
    /Give this special event a name/
  );
});

test('decorates special events with a form path and no other workflow paths', () => {
  const decorated = decorateEvent({
    eventId: 'special-event-20261001-cdo-abc123',
    eventType: 'Special Event',
    eventLabel: 'GeneSys Circle - Oct 1, 2026 - CDO',
    specialEventName: 'GeneSys Circle',
    dateTime: '2099-10-01T18:00',
    publicSlug: 'spe-abc123'
  });

  assert.equal(decorated.specialFormPath, '/special-event/spe-abc123');
  assert.equal(decorated.specialEventDisplayName, 'GeneSys Circle');
  assert.equal(decorated.wellnessQuizPath, '');
  assert.equal(decorated.inBodyPath, '');
  assert.equal(decorated.groupDeliveryPath, '');
});

test('photo upload blocks are answerable and capped per form', () => {
  const form = buildForm([
    { type: 'short-text', label: 'Full Name' },
    { type: 'photo-upload', label: 'Your Photo', required: true }
  ]);

  assert.equal(form.fields[1].type, 'photo-upload');
  assert.equal(form.fields[1].required, true);
  assert.deepEqual(
    buildSpecialFormColumns(form).map((entry) => entry.column),
    ['Full Name', 'Your Photo']
  );

  assert.throws(
    () => buildForm(Array.from({ length: 4 }, (_, i) => ({ type: 'photo-upload', label: `Photo ${i}` }))),
    /at most 3 photo uploads/
  );
});

test('separates submitted photos from ordinary answers', () => {
  const form = buildForm([
    { type: 'short-text', label: 'Full Name', required: true },
    { type: 'photo-upload', label: 'Your Photo', required: true }
  ]);
  const event = { eventType: 'Special Event', specialForm: form };
  const [name, photo] = form.fields;
  const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  const result = normalizeSpecialFormSubmission(
    { answers: { [name.fieldId]: 'Mary', [photo.fieldId]: { dataUrl, fileName: 'selfie.jpg' } } },
    event
  );

  // The column is filled in with a reference once the photo is stored.
  assert.equal(result.answers['Your Photo'], '');
  assert.equal(result.photos.length, 1);
  assert.equal(result.photos[0].column, 'Your Photo');
  assert.equal(result.photos[0].fileName, 'selfie.jpg');
  assert.equal(result.photos[0].dataUrl, dataUrl);

  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { [name.fieldId]: 'Mary' } }, event),
    /"Your Photo" needs a photo/
  );
  assert.throws(
    () => normalizeSpecialFormSubmission(
      { answers: { [name.fieldId]: 'Mary', [photo.fieldId]: { dataUrl: 'https://evil.example/x.png' } } },
      event
    ),
    /PNG, JPG, GIF, or WebP photo/
  );
});

test('an optional photo question may be left empty', () => {
  const form = buildForm([{ type: 'photo-upload', label: 'Receipt' }]);
  const event = { eventType: 'Special Event', specialForm: form };
  const result = normalizeSpecialFormSubmission({ answers: {} }, event);

  assert.equal(result.answers.Receipt, '');
  assert.equal(result.photos.length, 0);
});
