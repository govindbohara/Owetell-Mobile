import type { Expense, Settlement } from "@/data/fixtures";

/**
 * Per-member net balance in cents (positive = they're owed money; negative = they owe).
 * Folds in both expenses (payer +amount, each split participant -share) and settlements
 * (a payment from `from` to `to` credits `from` and debits `to`) exactly the way the web
 * app's room analytics/CSV export describe theirs — unlike the old two-person-only estimate,
 * this is exact for rooms of any size.
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[],
): Record<string, number> {
  const balances: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const credit = (uid: string, cents: number) => {
    balances[uid] = (balances[uid] ?? 0) + cents;
  };

  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    credit(expense.paidBy, expense.amountCents);

    const splitWith = expense.splitWith.length > 0 ? expense.splitWith : memberIds;
    for (const [uid, cents] of Object.entries(expenseShares(expense, splitWith))) {
      credit(uid, -cents);
    }
  }

  for (const settlement of settlements) {
    if (settlement.deletedAt) continue;
    credit(settlement.from, settlement.amountCents);
    credit(settlement.to, -settlement.amountCents);
  }

  return balances;
}

/** Each split participant's share of an expense, in cents — explicit percentages when
 * present (rounded per participant), otherwise an even split across `splitWith`. */
function expenseShares(expense: Expense, splitWith: string[]): Record<string, number> {
  if (expense.splitPercentages && Object.keys(expense.splitPercentages).length > 0) {
    return Object.fromEntries(
      Object.entries(expense.splitPercentages).map(([uid, percent]) => [
        uid,
        Math.round((expense.amountCents * percent) / 100),
      ]),
    );
  }
  const share = expense.amountCents / splitWith.length;
  return Object.fromEntries(splitWith.map((uid) => [uid, Math.round(share)]));
}
