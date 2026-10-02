/**
 * Shared types for the Firestore documents the app reads and writes — named `fixtures.ts`
 * for historical reasons (it used to hold mock data too), but every screen now sources real
 * data from `src/utils/*-api.ts`. All money is integer cents, matching the backend.
 */

export type Member = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string;
  splitWith: string[];
  splitPercentages: Record<string, number>;
  category: string;
  date: string;
  weekStart: string;
  /** ISO timestamp, or `null` if live. Matches the web schema exactly — a plain string, not
   * a Firestore Timestamp (`assets/1.rules`'s `validExpense` requires `deletedAt is string`). */
  deletedAt: string | null;
};

export type Settlement = {
  id: string;
  amountCents: number;
  from: string;
  to: string;
  note: string;
  date: string;
  createdBy: string;
  /** Same string-not-Timestamp shape as `Expense.deletedAt` — settlements can never be
   * hard-deleted (`allow delete: if false`), only soft-deleted via this field. */
  deletedAt: string | null;
  deletedBy: string | null;
};

export type RoomSummary = {
  totalCents: number;
  count: number;
  months: Record<string, number>;
  weeks: Record<string, number>;
  /** Whole-room spend per category. */
  categories: Record<string, number>;
  /**
   * The current user's share per category. Not derivable from `categories`,
   * because each expense carries its own split percentages.
   */
  yourCategories: Record<string, number>;
  memberPaid: Record<string, number>;
  recentExpenses: Expense[];
};

/**
 * The current user's position in a room. `balanceCents` comes from the
 * settlement graph rather than `paid - share`, so it is carried explicitly.
 */
export type Position = {
  paidCents: number;
  shareCents: number;
  balanceCents: number;
  /** e.g. "you owe Rohan A$703.47" */
  settlement: string;
  /** Days since the balance was last cleared. */
  staleDays: number;
};

/** Mirrors `roomRole()` in `assets/1.rules`: the owner is always `'owner'`; when roles
 * aren't enforced everyone is `'edit'`; otherwise it's the member's explicit tier. */
export type RoomRole = "owner" | "admin" | "edit" | "read";

export type Room = {
  id: string;
  name: string;
  currencyCode: string;
  ownerId: string;
  roomRole: RoomRole;
  weeks: number;
  members: Member[];
  position: Position;
  summary: RoomSummary;
  /** Active (non-soft-deleted) settlement payments, newest first. */
  settlements: Settlement[];
};

export const currencies = [
  "AUD",
  "USD",
  "EUR",
  "GBP",
  "NPR",
  "INR",
  "CAD",
  "NZD",
];
