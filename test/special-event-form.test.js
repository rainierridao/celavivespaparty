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

const { evaluateSpecialFormVisibility } = __test;

function conditionalForm() {
  return normalizeSpecialFormDefinition({
    fields: [
      { fieldId: 'q1', type: 'multiple-choice', label: 'Are you bringing a guest?', options: ['Yes', 'No'], required: true },
      { fieldId: 'q2', type: 'short-text', label: 'Guest name', required: true, showIf: { fieldId: 'q1', values: ['Yes'] } },
      { fieldId: 'q3', type: 'dropdown', label: 'Guest meal', options: ['Chicken', 'Fish'], showIf: { fieldId: 'q1', values: ['Yes'] } }
    ]
  });
}

test('a follow-up question only appears for the answers that trigger it', () => {
  const form = conditionalForm();

  assert.deepEqual(form.fields[1].showIf, { fieldId: 'q1', values: ['Yes'] });

  const shown = evaluateSpecialFormVisibility(form, { q1: 'Yes' });
  assert.ok(shown.has('q2') && shown.has('q3'));

  const hidden = evaluateSpecialFormVisibility(form, { q1: 'No' });
  assert.ok(hidden.has('q1'));
  assert.ok(!hidden.has('q2') && !hidden.has('q3'));

  // No answer yet means the follow-up stays hidden.
  assert.ok(!evaluateSpecialFormVisibility(form, {}).has('q2'));
});

test('a hidden follow-up is neither required nor recorded', () => {
  const form = conditionalForm();
  const event = { eventType: 'Special Event', specialForm: form };

  // "Guest name" is required, but answering No must not block submission.
  const no = normalizeSpecialFormSubmission({ answers: { q1: 'No' } }, event);
  assert.equal(no.answers['Are you bringing a guest?'], 'No');
  assert.equal(no.answers['Guest name'], '');

  // A stale answer posted for a hidden block is discarded, not saved.
  const stale = normalizeSpecialFormSubmission(
    { answers: { q1: 'No', q2: 'Should not be kept', q3: 'Fish' } },
    event
  );
  assert.equal(stale.answers['Guest name'], '');
  assert.equal(stale.answers['Guest meal'], '');

  // Answering Yes makes it required again.
  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { q1: 'Yes' } }, event),
    /"Guest name" is required/
  );

  const yes = normalizeSpecialFormSubmission({ answers: { q1: 'Yes', q2: 'Ana Cruz', q3: 'Fish' } }, event);
  assert.equal(yes.answers['Guest name'], 'Ana Cruz');
  assert.equal(yes.answers['Guest meal'], 'Fish');
});

test('a chain of follow-ups collapses when the first link stops matching', () => {
  const form = normalizeSpecialFormDefinition({
    fields: [
      { fieldId: 'a', type: 'multiple-choice', label: 'Attending?', options: ['Yes', 'No'] },
      { fieldId: 'b', type: 'multiple-choice', label: 'Bringing a guest?', options: ['Yes', 'No'], showIf: { fieldId: 'a', values: ['Yes'] } },
      { fieldId: 'c', type: 'short-text', label: 'Guest name', showIf: { fieldId: 'b', values: ['Yes'] } }
    ]
  });

  assert.ok(evaluateSpecialFormVisibility(form, { a: 'Yes', b: 'Yes' }).has('c'));
  // b answered Yes but a says No, so b is hidden and c must go with it.
  assert.ok(!evaluateSpecialFormVisibility(form, { a: 'No', b: 'Yes' }).has('c'));
});

test('a checkbox question triggers on any matching selection', () => {
  const form = normalizeSpecialFormDefinition({
    fields: [
      { fieldId: 'topics', type: 'checkbox', label: 'Topics', options: ['Business', 'Wellness'] },
      { fieldId: 'detail', type: 'short-text', label: 'Which business topic?', showIf: { fieldId: 'topics', values: ['Business'] } }
    ]
  });

  assert.ok(evaluateSpecialFormVisibility(form, { topics: ['Business', 'Wellness'] }).has('detail'));
  assert.ok(!evaluateSpecialFormVisibility(form, { topics: ['Wellness'] }).has('detail'));
});

test('rejects rules that could never be answered', () => {
  const build = (fields) => normalizeSpecialFormDefinition({ fields });

  // Points at a later question.
  assert.throws(() => build([
    { fieldId: 'x', type: 'short-text', label: 'Name', showIf: { fieldId: 'y', values: ['Yes'] } },
    { fieldId: 'y', type: 'multiple-choice', label: 'Going?', options: ['Yes', 'No'] }
  ]), /comes before it/);

  // Points at itself.
  assert.throws(() => build([
    { fieldId: 'z', type: 'multiple-choice', label: 'Going?', options: ['Yes', 'No'], showIf: { fieldId: 'z', values: ['Yes'] } }
  ]), /comes before it/);

  // Points at a question with no fixed answers.
  assert.throws(() => build([
    { fieldId: 'n', type: 'short-text', label: 'Name' },
    { fieldId: 'm', type: 'short-text', label: 'More', showIf: { fieldId: 'n', values: ['Yes'] } }
  ]), /multiple choice, checkbox, dropdown, or poll/);

  // Points at an answer that no longer exists.
  assert.throws(() => build([
    { fieldId: 'p', type: 'multiple-choice', label: 'Going?', options: ['Yes', 'No'] },
    { fieldId: 'q', type: 'short-text', label: 'Detail', showIf: { fieldId: 'p', values: ['Maybe'] } }
  ]), /no longer offers/);
});

test('a photo upload can be revealed by one checkbox option', () => {
  // The awardee case: tick an achievement, then upload proof of it.
  const form = normalizeSpecialFormDefinition({
    fields: [
      {
        fieldId: 'ach',
        type: 'checkbox',
        label: 'What are your current achievements for 2026?',
        options: ['Pacesetter', 'Pacesetter Creator', 'None yet']
      },
      {
        fieldId: 'proof',
        type: 'photo-upload',
        label: 'Upload your awardee photo',
        required: true,
        showIf: { fieldId: 'ach', values: ['Pacesetter', 'Pacesetter Creator'] }
      }
    ]
  });
  const event = { eventType: 'Special Event', specialForm: form };
  const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  // Neither award ticked: the upload never appears, so it cannot block submission.
  const none = normalizeSpecialFormSubmission({ answers: { ach: ['None yet'] } }, event);
  assert.equal(none.answers['Upload your awardee photo'], '');
  assert.equal(none.photos.length, 0);

  // Ticking either award reveals it, and then it is genuinely required.
  assert.throws(
    () => normalizeSpecialFormSubmission({ answers: { ach: ['Pacesetter'] } }, event),
    /"Upload your awardee photo" needs a photo/
  );

  const awarded = normalizeSpecialFormSubmission(
    { answers: { ach: ['Pacesetter Creator'], proof: { dataUrl: photo, fileName: 'award.jpg' } } },
    event
  );
  assert.equal(awarded.photos.length, 1);
  assert.equal(awarded.photos[0].fileName, 'award.jpg');

  // A photo posted for a hidden upload is thrown away, not stored.
  const sneaky = normalizeSpecialFormSubmission(
    { answers: { ach: ['None yet'], proof: { dataUrl: photo, fileName: 'award.jpg' } } },
    event
  );
  assert.equal(sneaky.photos.length, 0);
  assert.equal(sneaky.answers['Upload your awardee photo'], '');
});
