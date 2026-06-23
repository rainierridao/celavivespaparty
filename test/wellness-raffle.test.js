const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../lib/platform');

const validConfig = {
  enabled: true,
  title: 'Spin to Win',
  losingLabel: 'Thank you for playing',
  losingColor: '#7457d9',
  prizes: [
    { id: 'prize_one', label: 'Prize One', color: '#e05a9d', quantity: 2, chance: 60 },
    { id: 'prize_two', label: 'Prize Two', color: '#f2a83b', quantity: 3, chance: 40 }
  ]
};

test('accepts prize shares totaling 100 percent of the winning pool', () => {
  const config = __test.normalizeWellnessRaffleConfig(validConfig);
  assert.equal(config.enabled, true);
  assert.equal(config.prizes.reduce((sum, prize) => sum + prize.chance, 0), 100);
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
    wellnessRaffleConfig: validConfig,
    wellnessRaffleSpinSheetName: 'Internal Spins'
  });
  assert.deepEqual(event, { eventId: 'event-1' });
});
