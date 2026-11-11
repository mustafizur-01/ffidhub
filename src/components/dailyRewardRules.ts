export const DAILY_REWARD_AMOUNT = 2;
export const DAILY_REWARD_COOLDOWN_HOURS = 48;

export const getDailyRewardHoursRemaining = (
  lastClaimAt: string | null,
  now = Date.now(),
) => {
  if (!lastClaimAt) return 0;
  const hoursSince = (now - new Date(lastClaimAt).getTime()) / 3_600_000;
  return Math.max(0, DAILY_REWARD_COOLDOWN_HOURS - hoursSince);
};