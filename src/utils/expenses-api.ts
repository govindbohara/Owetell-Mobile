import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import type { CategoryKey } from "@/constants/theme";
import { db } from "@/config/firebase";
import type { Expense, Member } from "@/data/fixtures";
import { mondayOf } from "@/utils/currency";

const EXPENSES_SUBCOLLECTION = "expenses";

function toExpense(id: string, data: DocumentData): Expense {
  return {
    id,
    description: data.description,
    amountCents: data.amountCents,
    paidBy: data.paidBy,
    splitWith: data.splitWith ?? [],
    splitPercentages: data.splitPercentages ?? {},
    category: data.category ?? "other",
    date: data.date,
    weekStart: data.weekStart,
    deletedAt: data.deletedAt ?? null,
  };
}

export type AddExpenseInput = {
  description: string;
  /** Integer cents. */
  amountCents: number;
  category?: CategoryKey;
  /** Defaults to the signed-in user. */
  paidBy?: string;
  /** Defaults to every current room member (even split). */
  splitWith?: string[];
  /** Defaults to an even split across `splitWith`. */
  splitPercentages?: Record<string, number>;
  /** ISO date/timestamp. Defaults to now. */
  date?: string;
};

/**
 * Adds an expense under `rooms/{roomId}/expenses`. Defaults to an even split across every
 * current member with the signed-in user as payer — pass `paidBy`/`splitWith`/
 * `splitPercentages` to override, mirroring `owetell_add_expense`.
 */
export async function addExpense(roomId: string, members: Member[], userId: string, input: AddExpenseInput) {
  const description = input.description.trim();
  if (!description) {
    throw new Error("Enter a description.");
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Enter an amount.");
  }

  const splitWith = input.splitWith ?? members.map((member) => member.id);
  const splitPercentages =
    input.splitPercentages ?? Object.fromEntries(splitWith.map((id) => [id, 100 / splitWith.length]));

  const date = input.date ? new Date(input.date) : new Date();
  await addDoc(collection(db, "rooms", roomId, EXPENSES_SUBCOLLECTION), {
    description,
    amountCents: Math.round(input.amountCents),
    paidBy: input.paidBy ?? userId,
    splitWith,
    splitPercentages,
    category: input.category ?? "other",
    date: date.toISOString().slice(0, 10),
    weekStart: mondayOf(date),
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** Lists a room's expenses, newest first. Excludes soft-deleted expenses unless
 * `includeDeleted` is set. */
export async function listExpenses(
  roomId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<Expense[]> {
  const expensesQuery = query(
    collection(db, "rooms", roomId, EXPENSES_SUBCOLLECTION),
    orderBy("date", "desc"),
  );
  const snapshot = await getDocs(expensesQuery);
  return snapshot.docs
    .map((docSnap) => toExpense(docSnap.id, docSnap.data()))
    .filter((expense) => options.includeDeleted || !expense.deletedAt);
}

export type UpdateExpenseInput = Partial<AddExpenseInput>;

/** Full edit of an existing expense. Rejected by the rules (`expenseEditable`) once the
 * expense involves a member who has since left the room — its allocation is frozen. */
export async function updateExpense(roomId: string, expenseId: string, input: UpdateExpenseInput) {
  const patch: DocumentData = { updatedAt: serverTimestamp() };
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.amountCents !== undefined) patch.amountCents = Math.round(input.amountCents);
  if (input.category !== undefined) patch.category = input.category;
  if (input.paidBy !== undefined) patch.paidBy = input.paidBy;
  if (input.splitWith !== undefined) patch.splitWith = input.splitWith;
  if (input.splitPercentages !== undefined) patch.splitPercentages = input.splitPercentages;
  if (input.date !== undefined) {
    const date = new Date(input.date);
    patch.date = date.toISOString().slice(0, 10);
    patch.weekStart = mondayOf(date);
  }
  await updateDoc(doc(db, "rooms", roomId, EXPENSES_SUBCOLLECTION, expenseId), patch);
}

/** Soft-delete (recoverable via `restoreExpense`): drops the expense out of totals,
 * balances, categories, and the ledger, but keeps the document around. */
export async function softDeleteExpense(roomId: string, expenseId: string, deletedBy: string) {
  await updateDoc(doc(db, "rooms", roomId, EXPENSES_SUBCOLLECTION, expenseId), {
    deletedAt: new Date().toISOString(),
    deletedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function restoreExpense(roomId: string, expenseId: string) {
  await updateDoc(doc(db, "rooms", roomId, EXPENSES_SUBCOLLECTION, expenseId), {
    deletedAt: null,
    deletedBy: null,
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete — irreversible. Rejected by the rules unless the expense is already
 * soft-deleted, or the caller is the room owner. */
export async function hardDeleteExpense(roomId: string, expenseId: string) {
  await deleteDoc(doc(db, "rooms", roomId, EXPENSES_SUBCOLLECTION, expenseId));
}
