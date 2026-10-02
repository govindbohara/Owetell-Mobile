import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import type { Member } from "@/data/fixtures";
import { type Frequency, nextDueDate } from "@/utils/billing";
import { mondayOf } from "@/utils/currency";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";

export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type PriceChange = { amountCents: number; changedAt: string };

/**
 * Shape reverse-engineered from the `owetell_add_subscription`/`update`/`confirm_charge`
 * MCP tool schemas — `assets/1.rules` only pins down the `chargeOnlyChange()` update-diff
 * surface (`charges`/`skippedDates`/`lastChargedAt`/`updatedAt`), not the full document.
 */
export type Subscription = {
  id: string;
  name: string;
  amountCents: number;
  frequency: Frequency;
  /** ISO date — the billing anchor. */
  startDate: string;
  category: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  trialEndsAt: string | null;
  cancelUrl: string | null;
  notes: string;
  paymentMethod: string;
  reminderDays: number;
  /** `null` for a personal subscription. */
  roomId: string | null;
  paidBy: string | null;
  splitWith: string[] | null;
  /** Who `canSeeSubscription()` lets read this doc — the room's members for a room
   * subscription, or just the creator for a personal one. */
  visibleToUsers: string[];
  createdBy: string;
  charges: string[];
  skippedDates: string[];
  lastChargedAt: string | null;
  priceHistory: PriceChange[];
};

function toSubscription(id: string, data: DocumentData): Subscription {
  return {
    id,
    name: data.name,
    amountCents: data.amountCents,
    frequency: data.frequency,
    startDate: data.startDate,
    category: data.category ?? "other",
    status: data.status ?? "active",
    isTrial: data.isTrial ?? false,
    trialEndsAt: data.trialEndsAt ?? null,
    cancelUrl: data.cancelUrl ?? null,
    notes: data.notes ?? "",
    paymentMethod: data.paymentMethod ?? "",
    reminderDays: data.reminderDays ?? 3,
    roomId: data.roomId ?? null,
    paidBy: data.paidBy ?? null,
    splitWith: data.splitWith ?? null,
    visibleToUsers: data.visibleToUsers ?? [],
    createdBy: data.createdBy,
    charges: data.charges ?? [],
    skippedDates: data.skippedDates ?? [],
    lastChargedAt: data.lastChargedAt ?? null,
    priceHistory: data.priceHistory ?? [],
  };
}

export type AddSubscriptionInput = {
  name: string;
  /** Integer cents, per billing period. */
  amountCents: number;
  frequency: Frequency;
  /** ISO date of the first charge — the billing anchor. */
  startDate: string;
  category?: string;
  isTrial?: boolean;
  trialEndsAt?: string;
  cancelUrl?: string;
  notes?: string;
  paymentMethod?: string;
  reminderDays?: number;
  status?: SubscriptionStatus;
  /** Share with a room. Omit for a personal subscription. */
  roomId?: string;
  /** Room subscriptions only — defaults to the caller. */
  paidBy?: string;
  /** Room subscriptions only — defaults to every current room member (even split). */
  splitWith?: string[];
};

/** Creates a subscription TEMPLATE — nothing hits the room ledger until `confirmCharge`. */
export async function addSubscription(userId: string, members: Member[], input: AddSubscriptionInput): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("Enter a name.");
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) throw new Error("Enter an amount.");

  const isRoomSubscription = !!input.roomId;
  const docRef = await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
    name,
    amountCents: Math.round(input.amountCents),
    frequency: input.frequency,
    startDate: input.startDate,
    category: input.category ?? "other",
    status: input.status ?? "active",
    isTrial: input.isTrial ?? false,
    trialEndsAt: input.trialEndsAt ?? null,
    cancelUrl: input.cancelUrl ?? null,
    notes: input.notes?.trim() ?? "",
    paymentMethod: input.paymentMethod ?? "",
    reminderDays: input.reminderDays ?? 3,
    roomId: input.roomId ?? null,
    paidBy: isRoomSubscription ? (input.paidBy ?? userId) : null,
    splitWith: isRoomSubscription ? (input.splitWith ?? members.map((member) => member.id)) : null,
    visibleToUsers: isRoomSubscription ? members.map((member) => member.id) : [userId],
    createdBy: userId,
    charges: [],
    skippedDates: [],
    lastChargedAt: null,
    priceHistory: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export type ListSubscriptionsOptions = {
  scope?: "all" | "personal" | "room";
  roomId?: string;
  includeCancelled?: boolean;
};

/** Lists every subscription the signed-in user can see (personal + room-shared), matching
 * `canSeeSubscription()`'s `visibleToUsers` check. */
export async function listSubscriptions(
  userId: string,
  options: ListSubscriptionsOptions = {},
): Promise<Subscription[]> {
  const subsQuery = query(collection(db, SUBSCRIPTIONS_COLLECTION), where("visibleToUsers", "array-contains", userId));
  const snapshot = await getDocs(subsQuery);
  let subs = snapshot.docs.map((docSnap) => toSubscription(docSnap.id, docSnap.data()));

  if (options.roomId) {
    subs = subs.filter((sub) => sub.roomId === options.roomId);
  } else if (options.scope === "personal") {
    subs = subs.filter((sub) => !sub.roomId);
  } else if (options.scope === "room") {
    subs = subs.filter((sub) => !!sub.roomId);
  }
  if (!options.includeCancelled) {
    subs = subs.filter((sub) => sub.status !== "cancelled");
  }
  return subs;
}

/**
 * Records that a subscription billed — mirrors `owetell_confirm_subscription_charge`. For a
 * room subscription this also writes a real expense (using the stored `paidBy`/`splitWith`)
 * in the same batch, so balances/analytics update exactly like a hand-entered expense; a
 * personal subscription only appends to its own charge history. Either way this advances the
 * derived `nextDueDate` by one billing period.
 */
export async function confirmCharge(subscription: Subscription, date?: string) {
  const chargeDate = date ?? nextDueDate(subscription).toISOString().slice(0, 10);
  const batch = writeBatch(db);

  if (subscription.roomId && subscription.paidBy && subscription.splitWith) {
    const splitWith = subscription.splitWith;
    const share = 100 / splitWith.length;
    batch.set(doc(collection(db, "rooms", subscription.roomId, "expenses")), {
      description: subscription.name,
      amountCents: subscription.amountCents,
      paidBy: subscription.paidBy,
      splitWith,
      splitPercentages: Object.fromEntries(splitWith.map((id) => [id, share])),
      category: subscription.category,
      date: chargeDate,
      weekStart: mondayOf(new Date(chargeDate)),
      deletedAt: null,
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(doc(db, SUBSCRIPTIONS_COLLECTION, subscription.id), {
    charges: [...subscription.charges, chargeDate],
    lastChargedAt: chargeDate,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export type UpdateSubscriptionInput = Partial<
  Omit<AddSubscriptionInput, "roomId" | "paidBy" | "splitWith">
>;

/**
 * Creator-only edit — mirrors `owetell_update_subscription`. Changing `amountCents` appends
 * the previous price to `priceHistory` first. Room/`paidBy`/`splitWith` are deliberately not
 * editable here — delete and re-add to move a subscription between rooms.
 */
export async function updateSubscription(subscription: Subscription, input: UpdateSubscriptionInput) {
  const patch: DocumentData = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.amountCents !== undefined && input.amountCents !== subscription.amountCents) {
    patch.amountCents = Math.round(input.amountCents);
    patch.priceHistory = [
      ...subscription.priceHistory,
      { amountCents: subscription.amountCents, changedAt: new Date().toISOString() },
    ];
  }
  if (input.frequency !== undefined) patch.frequency = input.frequency;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.category !== undefined) patch.category = input.category;
  if (input.status !== undefined) patch.status = input.status;
  if (input.isTrial !== undefined) patch.isTrial = input.isTrial;
  if (input.trialEndsAt !== undefined) patch.trialEndsAt = input.trialEndsAt;
  if (input.cancelUrl !== undefined) patch.cancelUrl = input.cancelUrl;
  if (input.notes !== undefined) patch.notes = input.notes.trim();
  if (input.paymentMethod !== undefined) patch.paymentMethod = input.paymentMethod;
  if (input.reminderDays !== undefined) patch.reminderDays = input.reminderDays;
  await updateDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscription.id), patch);
}

/** Hard delete — irreversible, creator-only. Expenses already created from confirmed
 * charges are NOT removed; they stay in the room ledger where they belong. Prefer
 * `updateSubscription(sub, { status: 'cancelled' })` to stop tracking without losing history. */
export async function deleteSubscription(subscriptionId: string) {
  await deleteDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId));
}
