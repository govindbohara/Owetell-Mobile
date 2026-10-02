import { User } from "firebase/auth";
import {
  collection,
  type DocumentData,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/config/firebase";
import type { RemovedMember, RoomRecord } from "@/utils/rooms-api";

const ROOMS_COLLECTION = "rooms";
const MEMBER_EVENTS_SUBCOLLECTION = "memberEvents";

export type RoomMemberRole = "admin" | "edit" | "read";

export type MemberEvent = {
  id: string;
  actorId: string;
  type: string;
  targetId: string | null;
  role: string | null;
  at: string;
};

/** Append-only audit trail for a room's membership/role events, newest first. */
export async function listMemberEvents(roomId: string): Promise<MemberEvent[]> {
  const eventsQuery = query(
    collection(db, ROOMS_COLLECTION, roomId, MEMBER_EVENTS_SUBCOLLECTION),
    orderBy("at", "desc"),
  );
  const snapshot = await getDocs(eventsQuery);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      actorId: data.actorId,
      type: data.type,
      targetId: data.targetId ?? null,
      role: data.role ?? null,
      at: data.at,
    };
  });
}

/**
 * Shared write for every "a member leaves" path (owner removal, admin removal, self-leave):
 * mirrors `validMemberDeparture()` exactly — pull the departing member out of `members`/
 * `memberIds`/`roles`, and append one entry to `removedMembers` (dropping the oldest once
 * that log hits its 50-entry cap, per the rules). Also logs a `memberEvents` doc in the same
 * batch, matching the web app's audit trail.
 */
async function departMember(
  record: RoomRecord,
  targetUid: string,
  reason: RemovedMember["reason"],
  actor: User,
) {
  const removedAt = new Date().toISOString();
  const departingName = record.members.find((member) => member.id === targetUid)?.name ?? "member";
  const entry: RemovedMember = {
    id: targetUid,
    name: departingName,
    reason,
    removedBy: actor.uid,
    removedAt,
  };
  const removedMembers =
    record.removedMembers.length >= 50
      ? [...record.removedMembers.slice(1), entry]
      : [...record.removedMembers, entry];

  const roles = { ...record.roles };
  delete roles[targetUid];

  const batch = writeBatch(db);
  batch.update(doc(db, ROOMS_COLLECTION, record.id), {
    memberIds: record.memberIds.filter((id) => id !== targetUid),
    members: record.members.filter((member) => member.id !== targetUid),
    roles,
    removedMembers,
    updatedAt: serverTimestamp(),
  } satisfies DocumentData);
  batch.set(doc(collection(db, ROOMS_COLLECTION, record.id, MEMBER_EVENTS_SUBCOLLECTION)), {
    actorId: actor.uid,
    type: reason === "left" ? "left" : "removed",
    targetId: targetUid,
    at: removedAt,
  });
  await batch.commit();
}

/** Owner or admin removing another (non-owner, non-admin-if-actor-is-admin) member —
 * mirrors `ownerRemoveMember()`/`adminRemoveMember()`. */
export async function removeMember(record: RoomRecord, targetUid: string, actor: User) {
  if (targetUid === record.ownerId) {
    throw new Error("The room owner can't be removed.");
  }
  await departMember(record, targetUid, "removed", actor);
}

/** Self-leave. The owner can't leave — transfer ownership first, mirroring
 * `selfLeaveRoom()`/`validMemberDeparture()`'s `gone.id != ownerId` guard. */
export async function leaveRoom(record: RoomRecord, user: User) {
  if (user.uid === record.ownerId) {
    throw new Error("Transfer ownership before leaving this room.");
  }
  await departMember(record, user.uid, "left", user);
}

/**
 * Instant ownership transfer — mirrors `ownerTransfer()`. The new owner must already be a
 * member; the old owner stays on as a regular member with a materialized `'edit'` role
 * (rules forbid the current owner appearing as a key in `roles`, so their prior entry, if
 * any, is preserved and only defaulted when missing).
 */
export async function transferOwnership(record: RoomRecord, newOwnerUid: string, actor: User) {
  if (actor.uid !== record.ownerId) {
    throw new Error("Only the room owner can transfer ownership.");
  }
  if (!record.memberIds.includes(newOwnerUid)) {
    throw new Error("Pick a current member to transfer ownership to.");
  }

  const roles = { ...record.roles };
  delete roles[newOwnerUid];
  if (!(record.ownerId in roles)) {
    roles[record.ownerId] = "edit";
  }

  const batch = writeBatch(db);
  batch.update(doc(db, ROOMS_COLLECTION, record.id), {
    ownerId: newOwnerUid,
    roles,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, ROOMS_COLLECTION, record.id, MEMBER_EVENTS_SUBCOLLECTION)), {
    actorId: actor.uid,
    type: "ownerTransferred",
    targetId: newOwnerUid,
    at: new Date().toISOString(),
  });
  await batch.commit();
}

/** Owner-only role assignment — mirrors `ownerRoleChange()`. Touches only the target
 * member's own key in the `roles` map. */
export async function setMemberRole(record: RoomRecord, targetUid: string, role: RoomMemberRole, actor: User) {
  if (actor.uid !== record.ownerId) {
    throw new Error("Only the room owner can change roles.");
  }
  if (targetUid === record.ownerId) {
    throw new Error("The room owner's role can't be changed.");
  }

  const batch = writeBatch(db);
  batch.update(doc(db, ROOMS_COLLECTION, record.id), {
    [`roles.${targetUid}`]: role,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, ROOMS_COLLECTION, record.id, MEMBER_EVENTS_SUBCOLLECTION)), {
    actorId: actor.uid,
    type: "roleChanged",
    targetId: targetUid,
    role,
    at: new Date().toISOString(),
  });
  await batch.commit();
}

/** Owner-only toggle for whether `roles` is enforced at all — mirrors `ownerRoleChange()`. */
export async function setRolesEnabled(record: RoomRecord, enabled: boolean, actor: User) {
  if (actor.uid !== record.ownerId) {
    throw new Error("Only the room owner can change this.");
  }
  await updateDoc(doc(db, ROOMS_COLLECTION, record.id), {
    settings: { rolesEnabled: enabled },
    updatedAt: serverTimestamp(),
  });
}
