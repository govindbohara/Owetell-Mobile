import * as Crypto from "expo-crypto";
import { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import type { Expense, Member, Position, Room, RoomRole, RoomSummary, Settlement } from "@/data/fixtures";
import { calculateBalances } from "@/utils/balances";
import { formatCents } from "@/utils/currency";
import { listExpenses } from "@/utils/expenses-api";
import { listSettlements } from "@/utils/settlements-api";

const ROOMS_COLLECTION = "rooms";
const INVITES_COLLECTION = "roomInvites";

export type CreateRoomInput = {
  name: string;
  currencyCode: string;
};

export type RemovedMember = {
  id: string;
  name: string;
  reason: "removed" | "left";
  removedBy: string;
  removedAt: string;
};

/** The shape actually stored in `rooms/{roomId}`, matching the web app's schema
 * (`assets/1.rules`) field-for-field. */
export type RoomRecord = {
  id: string;
  name: string;
  currencyCode: string;
  ownerId: string;
  memberIds: string[];
  members: Member[];
  /** Non-owner members only — the rules forbid the owner appearing here. */
  roles: Record<string, "admin" | "edit" | "read">;
  /** `rolesEnabled` is left `undefined` (not `false`) when the field is genuinely absent
   * from Firestore, so `rolesEnforced` below can fall back to inference exactly like the
   * rules do — collapsing it to `false` here would break that fallback for legacy rooms. */
  settings: { rolesEnabled?: boolean };
  removedMembers: RemovedMember[];
  inviteToken: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

function toRoomRecord(id: string, data: DocumentData): RoomRecord {
  const createdAt = data.createdAt as Timestamp | undefined;
  const updatedAt = data.updatedAt as Timestamp | undefined;
  const deletedAt = data.deletedAt as Timestamp | undefined;
  return {
    id,
    name: data.name,
    currencyCode: data.currencyCode,
    ownerId: data.ownerId,
    memberIds: data.memberIds ?? [],
    members: data.members ?? [],
    roles: data.roles ?? {},
    settings: data.settings ?? {},
    removedMembers: data.removedMembers ?? [],
    inviteToken: data.inviteToken ?? null,
    createdAt: createdAt ? createdAt.toDate() : null,
    updatedAt: updatedAt ? updatedAt.toDate() : null,
    deletedAt: deletedAt ? deletedAt.toDate() : null,
    deletedBy: data.deletedBy ?? null,
  };
}

/** Mirrors the rules' `rolesEnforced()`: the explicit `settings.rolesEnabled` toggle when
 * present, otherwise (legacy rooms) inferred from any non-`'edit'` role already on the map. */
export function rolesEnforced(record: RoomRecord): boolean {
  if (record.settings.rolesEnabled != null) return record.settings.rolesEnabled;
  return Object.values(record.roles).some((role) => role === "read" || role === "admin");
}

/** Mirrors the rules' `roomRole()`: the owner always wins; when roles aren't enforced
 * everyone edits; otherwise the explicit map entry, defaulting to `'edit'`. */
export function roomRole(record: RoomRecord, uid: string): RoomRole {
  if (uid === record.ownerId) return "owner";
  if (!rolesEnforced(record)) return "edit";
  return record.roles[uid] ?? "edit";
}

function daysSince(dateIso: string, now = new Date()): number {
  const diffMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(dateIso).getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

function computeSummary(expenses: Expense[], currentUserId: string): RoomSummary {
  const months: Record<string, number> = {};
  const weeks: Record<string, number> = {};
  const categories: Record<string, number> = {};
  const yourCategories: Record<string, number> = {};
  const memberPaid: Record<string, number> = {};
  let totalCents = 0;

  for (const expense of expenses) {
    totalCents += expense.amountCents;
    const month = expense.date.slice(0, 7);
    months[month] = (months[month] ?? 0) + expense.amountCents;
    weeks[expense.weekStart] = (weeks[expense.weekStart] ?? 0) + expense.amountCents;
    categories[expense.category] = (categories[expense.category] ?? 0) + expense.amountCents;
    memberPaid[expense.paidBy] = (memberPaid[expense.paidBy] ?? 0) + expense.amountCents;

    const yourShare = expense.splitPercentages[currentUserId];
    if (yourShare) {
      const cents = Math.round((expense.amountCents * yourShare) / 100);
      yourCategories[expense.category] = (yourCategories[expense.category] ?? 0) + cents;
    }
  }

  return { totalCents, count: expenses.length, months, weeks, categories, yourCategories, memberPaid, recentExpenses: expenses };
}

/**
 * The current user's position in a room. `balanceCents` comes from `calculateBalances`
 * (expenses + settlements together), so — unlike the old paid-minus-share estimate — it's
 * exact for rooms of any size, not just two members.
 */
function computePosition(
  expenses: Expense[],
  balances: Record<string, number>,
  currentUserId: string,
  members: Member[],
  currencyCode: string,
): Position {
  let paidCents = 0;
  let shareCents = 0;

  for (const expense of expenses) {
    if (expense.paidBy === currentUserId) paidCents += expense.amountCents;
    const yourShare = expense.splitPercentages[currentUserId];
    if (yourShare) shareCents += Math.round((expense.amountCents * yourShare) / 100);
  }

  const balanceCents = balances[currentUserId] ?? 0;
  const others = members.filter((member) => member.id !== currentUserId);
  const counterpart = others.length === 1 ? ` ${others[0].name}` : "";

  let settlement = "settled up";
  if (balanceCents < 0) {
    settlement = `you owe${counterpart} ${formatCents(Math.abs(balanceCents), currencyCode)}`;
  } else if (balanceCents > 0) {
    settlement = counterpart
      ? `${others[0].name} owes you ${formatCents(balanceCents, currencyCode)}`
      : `you're owed ${formatCents(balanceCents, currencyCode)}`;
  }

  const staleDays = balanceCents === 0 || expenses.length === 0 ? 0 : daysSince(expenses[0].date);

  return { paidCents, shareCents, balanceCents, settlement, staleDays };
}

/**
 * Fills in the expense/settlement-derived fields the UI expects (`position`, `summary`,
 * `roomRole`) from the room's actual ledger.
 */
export function toRoom(
  record: RoomRecord,
  currentUserId: string,
  expenses: Expense[] = [],
  settlements: Settlement[] = [],
): Room {
  const activeExpenses = expenses.filter((expense) => !expense.deletedAt);
  const activeSettlements = settlements.filter((settlement) => !settlement.deletedAt);
  const summary = computeSummary(activeExpenses, currentUserId);
  const balances = calculateBalances(activeExpenses, activeSettlements, record.memberIds);
  return {
    id: record.id,
    name: record.name,
    currencyCode: record.currencyCode,
    ownerId: record.ownerId,
    roomRole: roomRole(record, currentUserId),
    weeks: Object.keys(summary.weeks).length,
    members: record.members,
    position: computePosition(activeExpenses, balances, currentUserId, record.members, record.currencyCode),
    summary,
    settlements: activeSettlements,
  };
}

/** Fetches a room together with its expenses and settlements, fully hydrated for the UI. */
export async function getRoomWithExpenses(record: RoomRecord, currentUserId: string): Promise<Room> {
  const [expenses, settlements] = await Promise.all([listExpenses(record.id), listSettlements(record.id)]);
  return toRoom(record, currentUserId, expenses, settlements);
}

/**
 * Creates a `rooms/{roomId}` document with the signed-in user as owner and sole member, and
 * mints its first invite in the same batch — `canMintInvite()`'s `getAfter()` is explicitly
 * written to allow a same-batch room-create-plus-invite, and `owetell_create_room` on the web
 * returns an `inviteToken` immediately for the same reason.
 */
export async function createRoom(user: User, input: CreateRoomInput): Promise<{ roomId: string; inviteToken: string }> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Enter a room name.");
  }

  const owner: Member = {
    id: user.uid,
    name: user.displayName || user.email || "You",
  };

  const roomRef = doc(collection(db, ROOMS_COLLECTION));
  const inviteToken = Crypto.randomUUID();

  const batch = writeBatch(db);
  batch.set(roomRef, {
    name,
    currencyCode: input.currencyCode,
    ownerId: user.uid,
    memberIds: [user.uid],
    members: [owner],
    roles: {},
    settings: { rolesEnabled: false },
    removedMembers: [],
    inviteToken,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, INVITES_COLLECTION, inviteToken), {
    roomId: roomRef.id,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  return { roomId: roomRef.id, inviteToken };
}

/** Fetches a single room by id, or `null` if it doesn't exist. */
export async function getRoom(roomId: string): Promise<RoomRecord | null> {
  const snapshot = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
  return snapshot.exists() ? toRoomRecord(snapshot.id, snapshot.data()) : null;
}

/**
 * Lists every room the given user belongs to, newest first. Excludes soft-deleted rooms
 * unless `includeDeleted` is set.
 *
 * Sorted client-side rather than via an `orderBy` clause — combining that with the
 * `array-contains` filter would require a composite index, and a single user's room count is
 * small enough that this is cheap.
 */
export async function listRooms(uid: string, options: { includeDeleted?: boolean } = {}): Promise<RoomRecord[]> {
  const roomsQuery = query(collection(db, ROOMS_COLLECTION), where("memberIds", "array-contains", uid));
  const snapshot = await getDocs(roomsQuery);
  return snapshot.docs
    .map((docSnap) => toRoomRecord(docSnap.id, docSnap.data()))
    .filter((record) => options.includeDeleted || !record.deletedAt)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export type UpdateRoomInput = {
  name?: string;
  currencyCode?: string;
};

/** Editor-level room edits: rename or change currency. Matches `memberRoomUpdate()`'s
 * allowed field set — never touches membership, ownership, or roles. */
export async function updateRoom(roomId: string, input: UpdateRoomInput) {
  const patch: DocumentData = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Enter a room name.");
    patch.name = name;
  }
  if (input.currencyCode !== undefined) patch.currencyCode = input.currencyCode;
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), patch);
}

/** Soft-deletes a room (owner or editor) — recoverable with `restoreRoom`. Expenses,
 * settlements, and the summary are preserved. */
export async function softDeleteRoom(roomId: string, deletedBy: string) {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    deletedAt: serverTimestamp(),
    deletedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function restoreRoom(roomId: string) {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    deletedAt: null,
    deletedBy: null,
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete — only the room owner may do this per the rules. There is no cascade delete
 * of expenses/settlements/subcollections here; prefer `softDeleteRoom` in the UI. */
export async function hardDeleteRoom(roomId: string) {
  await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
}
