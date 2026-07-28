const test = require('node:test');
const assert = require('node:assert/strict');
const { __test: platformTest } = require('../lib/platform');
const { __test: storageTest } = require('../lib/firestore-storage');

const HEADERS = ['Timestamp', 'Name', 'Email Address'];

function firestoreRow(rowNumber, values) {
  return { rowNumber, values };
}

test('firestore rows keep their row number position after a delete', () => {
  const rows = storageTest.alignRowsByRowNumber([
    firestoreRow(1, HEADERS),
    firestoreRow(4, ['2026-07-04', 'Dana', 'dana@example.com']),
    firestoreRow(2, ['2026-07-02', 'Ana', 'ana@example.com'])
  ]);

  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], HEADERS);
  assert.deepEqual(rows[2], []);
  assert.deepEqual(rows[3], ['2026-07-04', 'Dana', 'dana@example.com']);
});

test('response row numbers survive gaps left by deleted entries', () => {
  const responses = platformTest.mapSheetRowsToObjects([
    HEADERS,
    ['2026-07-02', 'Ana', 'ana@example.com'],
    [],
    ['2026-07-04', 'Dana', 'dana@example.com']
  ]);

  assert.deepEqual(
    responses.map((row) => [row.Name, row.__rowNumber]),
    [
      ['Ana', 2],
      ['Dana', 4]
    ]
  );
});

test('empty tables map to no responses', () => {
  assert.deepEqual(storageTest.alignRowsByRowNumber([]), []);
  assert.deepEqual(platformTest.mapSheetRowsToObjects([]), []);
  assert.deepEqual(platformTest.mapSheetRowsToObjects([HEADERS]), []);
});
