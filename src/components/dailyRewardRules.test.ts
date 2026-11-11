import assert from 'node:assert/strict';
import {
  DAILY_REWARD_AMOUNT,
  DAILY_REWARD_COOLDOWN_HOURS,
  getDailyRewardHoursRemaining,
} from './dailyRewardRules';

assert.equal(DAILY_REWARD_AMOUNT, 2, 'The daily reward stays ₹2');
assert.equal(DAILY_REWARD_COOLDOWN_HOURS, 48, 'The cooldown stays 48 hours');

const claimedAt = '2026-10-13T00:00:00.000Z';
const now = new Date(claimedAt).getTime();

assert.equal(
  getDailyRewardHoursRemaining(claimedAt, now + 24 * 3_600_000),
  24,
  'Exactly 24 hours remain after the first day',
);
assert.equal(
  getDailyRewardHoursRemaining(claimedAt, now + 48 * 3_600_000),
  0,
  'The bonus becomes claimable after 48 hours',
);

console.log('Daily reward rule checks passed.');