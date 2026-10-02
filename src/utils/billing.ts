export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

const DAY_MS = 86_400_000;
const MONTHS_PER_PERIOD: Record<Exclude<Frequency, "weekly">, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** Adds `months` to `date`, clamping to the last valid day of the target month — a 31st
 * start bills Feb 28 and returns to the 31st in March, matching the web app's documented
 * billing-anchor behavior. */
function addMonthsClamped(date: Date, months: number, anchorDay: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchorDay, daysInMonth));
  return target;
}

/**
 * The due date `periods` billing cycles after `startDate` — always re-derived from the
 * original anchor date (not the previous due date), so the "clamps then re-anchors" behavior
 * falls out naturally rather than drifting month to month.
 */
function advancePeriods(startDate: Date, frequency: Frequency, periods: number): Date {
  if (frequency === "weekly") {
    return new Date(startDate.getTime() + periods * 7 * DAY_MS);
  }
  const anchorDay = startDate.getUTCDate();
  return addMonthsClamped(startDate, MONTHS_PER_PERIOD[frequency] * periods, anchorDay);
}

export type SubscriptionLike = {
  startDate: string;
  frequency: Frequency;
  charges: string[];
};

/** The next (possibly overdue — i.e. in the past) due date, derived from how many charges
 * have been confirmed so far. Never stored; always computed. */
export function nextDueDate(subscription: SubscriptionLike): Date {
  return advancePeriods(new Date(subscription.startDate), subscription.frequency, subscription.charges.length);
}

export function daysUntilDue(subscription: SubscriptionLike, now = new Date()): number {
  return Math.round((nextDueDate(subscription).getTime() - now.getTime()) / DAY_MS);
}

const PERIODS_PER_MONTH: Record<Frequency, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function monthlyCents(amountCents: number, frequency: Frequency): number {
  return amountCents * PERIODS_PER_MONTH[frequency];
}

export function annualCents(amountCents: number, frequency: Frequency): number {
  return monthlyCents(amountCents, frequency) * 12;
}
