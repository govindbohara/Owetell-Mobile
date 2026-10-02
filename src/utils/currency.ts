const SYMBOLS: Record<string, string> = {
  AUD: 'A$',
  USD: 'US$',
  NZD: 'NZ$',
  CAD: 'CA$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  NPR: 'रू',
};

function symbolFor(currency: string) {
  return SYMBOLS[currency] ?? `${currency} `;
}

function group(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formats integer cents the way the web ledger does: A$12,343.53 */
export function formatCents(cents: number, currency = 'AUD'): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = group(String(Math.floor(abs / 100)));
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${symbolFor(currency)}${whole}.${fraction}`;
}

/** Compact form for chart axes: 1.5k, 12.3k */
export function formatCompactCents(cents: number): string {
  const units = Math.round(Math.abs(cents) / 100);
  if (units >= 1000) return `${(units / 1000).toFixed(1)}k`;
  return String(units);
}

export function formatCurrency(amount: number, currency = 'AUD'): string {
  return formatCents(Math.round(amount * 100), currency);
}

/** Monday (UTC) of the week containing `date`, as an ISO date string — the same
 * week-bucketing expenses store as `weekStart`, reused so settlements (which don't store
 * one) can be grouped alongside them for display. */
export function mondayOf(date: Date): string {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "5d ago", "today", "3w ago" — matches the web's terse relative labels. */
export function formatRelativeDate(isoDate: string, now = new Date()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(isoDate))) / DAY_MS);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 28) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/** "in 1d", "in 10d" — used by the subscriptions list. */
export function formatCountdown(isoDate: string, now = new Date()): string {
  const diffDays = Math.round((startOfDay(new Date(isoDate)) - startOfDay(now)) / DAY_MS);
  if (diffDays <= 0) return 'today';
  return `${diffDays}d`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Aug 24–30" / "Aug 31–Sep 6" for the week strip. */
export function formatWeekRange(weekStartIso: string): string {
  const start = new Date(weekStartIso);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const startLabel = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? String(end.getDate())
      : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel}–${endLabel}`;
}

export function monthLabel(isoMonth: string): string {
  const [, month] = isoMonth.split('-');
  return MONTHS[Number(month) - 1];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
