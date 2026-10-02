import * as Crypto from "expo-crypto";
import { User } from "firebase/auth";
import { arrayUnion, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";

import { db } from "@/config/firebase";
import type { Member } from "@/data/fixtures";

const INVITES_COLLECTION = "roomInvites";
const ROOMS_COLLECTION = "rooms";

export type RoomInvite = {
  token: string;
  roomId: string;
  createdBy: string;
  createdAt: Date | null;
};

function toInvite(token: string, data: Record<string, unknown>): RoomInvite {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    token,
    roomId: data.roomId as string,
    createdBy: data.createdBy as string,
    createdAt: createdAt?.toDate ? createdAt.toDate() : null,
  };
}

/**
 * Mints a fresh invite token for an EXISTING room and points `rooms/{roomId}.inviteToken` at
 * it, in one batch — `validRoomJoin()` in `assets/1.rules` only accepts a join whose token
 * matches the room's current `inviteToken`, so rotating one without the other would silently
 * break joining. (The very first invite is minted alongside room creation itself, in
 * `createRoom` — see `rooms-api.ts` — for the same atomicity reason.)
 */
export async function mintInvite(roomId: string, user: User): Promise<string> {
  const token = Crypto.randomUUID();
  const batch = writeBatch(db);
  batch.set(doc(db, INVITES_COLLECTION, token), {
    roomId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, ROOMS_COLLECTION, roomId), {
    inviteToken: token,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return token;
}

export async function getInvite(token: string): Promise<RoomInvite | null> {
  const snapshot = await getDoc(doc(db, INVITES_COLLECTION, token));
  return snapshot.exists() ? toInvite(snapshot.id, snapshot.data()) : null;
}

/** Revokes an invite outright (any current room member may do this per the rules). */
export async function revokeInvite(token: string): Promise<void> {
  await deleteDoc(doc(db, INVITES_COLLECTION, token));
}

/**
 * Joins the signed-in user to the room an invite names, mirroring `validRoomJoin()` exactly:
 * appends to `members`/`memberIds`, records `lastJoin`, and writes the joiner's own `roles`
 * entry as `'edit'` (touching only that one key in the map). Firestore rejects the write
 * outright if the invite is stale (room's `inviteToken` has since rotated) or expired
 * (>7 days old) — those surface here as a generic permission error.
 */
export async function joinRoomByToken(token: string, user: User): Promise<string> {
  const invite = await getInvite(token);
  if (!invite) {
    throw new Error("This invite link is no longer valid.");
  }

  const roomRef = doc(db, ROOMS_COLLECTION, invite.roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error("This room no longer exists.");
  }
  const room = roomSnap.data();
  if (((room.memberIds as string[] | undefined) ?? []).includes(user.uid)) {
    return invite.roomId;
  }

  const member: Member = { id: user.uid, name: user.displayName || user.email || "Member" };

  try {
    await updateDoc(roomRef, {
      members: arrayUnion(member),
      memberIds: arrayUnion(user.uid),
      lastJoin: { uid: user.uid, token },
      [`roles.${user.uid}`]: "edit",
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("This invite link has expired or been revoked.");
  }

  return invite.roomId;
}
