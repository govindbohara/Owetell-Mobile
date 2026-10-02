import {
  addDoc,
  collection,
  doc,
  type DocumentData,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import type { Settlement } from "@/data/fixtures";

const SETTLEMENTS_SUBCOLLECTION = "settlements";

function toSettlement(id: string, data: DocumentData): Settlement {
  return {
    id,
    amountCents: data.amountCents,
    from: data.from,
    to: data.to,
    note: data.note ?? "",
    date: data.date,
    createdBy: data.createdBy,
    deletedAt: data.deletedAt ?? null,
    deletedBy: data.deletedBy ?? null,
  };
}

export type AddSettlementInput = {
  from: string;
  to: string;
  /** Integer cents. */
  amountCents: number;
  note?: string;
  /** ISO date. Defaults to today. */
  date?: string;
};

/** Records a payment between two room members under `rooms/{roomId}/settlements`. */
export async function addSettlement(roomId: string, createdBy: string, input: AddSettlementInput) {
  if (input.from === input.to) {
    throw new Error("Pick two different people.");
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Enter an amount.");
  }

  await addDoc(collection(db, "rooms", roomId, SETTLEMENTS_SUBCOLLECTION), {
    amountCents: Math.round(input.amountCents),
    from: input.from,
    to: input.to,
    note: input.note?.trim() ?? "",
    date: input.date ?? new Date().toISOString().slice(0, 10),
    createdBy,
    deletedAt: null,
    deletedBy: null,
  });
}

/** Lists a room's settlement payments, newest first. Excludes soft-deleted payments unless
 * `includeDeleted` is set. */
export async function listSettlements(
  roomId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<Settlement[]> {
  const settlementsQuery = query(
    collection(db, "rooms", roomId, SETTLEMENTS_SUBCOLLECTION),
    orderBy("date", "desc"),
  );
  const snapshot = await getDocs(settlementsQuery);
  return snapshot.docs
    .map((docSnap) => toSettlement(docSnap.id, docSnap.data()))
    .filter((settlement) => options.includeDeleted || !settlement.deletedAt);
}

export type UpdateSettlementInput = Partial<AddSettlementInput>;

/**
 * Edits a settlement. Per `assets/1.rules` this also un-deletes it (clears
 * `deletedAt`/`deletedBy`) — matches the web app's "editing a soft-deleted payment brings it
 * back" behavior. Rejected by the rules if the settlement is a `writeOff` (never set by this
 * client today).
 */
export async function updateSettlement(roomId: string, settlementId: string, input: UpdateSettlementInput) {
  const patch: DocumentData = { deletedAt: null, deletedBy: null };
  if (input.from !== undefined) patch.from = input.from;
  if (input.to !== undefined) patch.to = input.to;
  if (input.amountCents !== undefined) patch.amountCents = Math.round(input.amountCents);
  if (input.note !== undefined) patch.note = input.note.trim();
  if (input.date !== undefined) patch.date = input.date;
  await updateDoc(doc(db, "rooms", roomId, SETTLEMENTS_SUBCOLLECTION, settlementId), patch);
}

/** Settlements can never be hard-deleted (`allow delete: if false`) — this sets
 * `deletedAt`/`deletedBy` so the payment stops affecting balances but stays recoverable via
 * `updateSettlement`. */
export async function softDeleteSettlement(roomId: string, settlementId: string, deletedBy: string) {
  await updateDoc(doc(db, "rooms", roomId, SETTLEMENTS_SUBCOLLECTION, settlementId), {
    deletedAt: new Date().toISOString(),
    deletedBy,
  });
}
