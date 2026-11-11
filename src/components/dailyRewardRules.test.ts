import { describe, expect, it } from 'bun:test';
import {
  DAILY_REWARD_AMOUNT,
  DAILY_REWARD_COOLDOWN_HOURS,
  getDailyRewardHoursRemaining,
} from './dailyRewardRules';

describe('daily reward rules', () => {
  it('keeps the reward at ₹2', () => {
    expect(DAILY_REWARD_AMOUNT).toBe(2);
  });

  it('enforces the chosen 48-hour cooldown', () => {
    expect(DAILY_REWARD_COOLDOWN_HOURS).toBe(48);
  });

  it('shows the exact remaining cooldown and becomes claimable at 48 hours', () => {
    const claimedAt = '2026-10-13T00:00:00.000Z';
    const now = new Date(claimedAt).getTime();

    expect(getDailyRewardHoursRemaining(claimedAt, now + 24 * 3_600_000)).toBe(24);
    expect(getDailyRewardHoursRemaining(claimedAt, now + 48 * 3_600_000)).toBe(0);
  });
});