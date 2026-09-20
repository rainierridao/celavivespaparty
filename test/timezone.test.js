const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const PLATFORM = path.join(__dirname, '..', 'lib', 'platform.js');
const INSTANT = '2026-09-20T17:28:30.000Z'; // 1:28:30 AM on 21 Sep in Manila

function formatUnder(timeZone) {
  return execFileSync(
    process.execPath,
    ['-e', `process.stdout.write(require(${JSON.stringify(PLATFORM)}).__test.formatConfirmationTimestamp(${JSON.stringify(INSTANT)}))`],
    { env: { ...process.env, TZ: timeZone }, encoding: 'utf8' }
  );
}

test('confirmation timestamps read in Philippine time wherever the server runs', () => {
  // Netlify functions run in UTC; a laptop in Manila does not. Both must agree.
  const onNetlify = formatUnder('UTC');
  const onLaptop = formatUnder('Asia/Manila');
  const somewhereElse = formatUnder('America/New_York');

  assert.equal(onNetlify, onLaptop);
  assert.equal(onNetlify, somewhereElse);
  assert.match(onNetlify, /September 21, 2026 at 1:28:30\sAM GMT\+8/);
});

test('the timezone can be overridden for a different region', () => {
  const output = execFileSync(
    process.execPath,
    ['-e', `process.stdout.write(require(${JSON.stringify(PLATFORM)}).__test.formatConfirmationTimestamp(${JSON.stringify(INSTANT)}))`],
    { env: { ...process.env, TZ: 'UTC', EVENT_TIME_ZONE: 'Asia/Tokyo' }, encoding: 'utf8' }
  );

  assert.match(output, /2:28:30\sAM GMT\+9/);
});

test('an unparseable timestamp falls back to now rather than throwing', () => {
  const { __test } = require('../lib/platform');
  assert.match(__test.formatConfirmationTimestamp('not-a-date'), /GMT\+8/);
  assert.match(__test.formatConfirmationTimestamp(''), /GMT\+8/);
});
