import { User } from "firebase/auth";
import { doc, type DocumentData, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/config/firebase";

const PROFILES_COLLECTION = "profiles";
const USERNAMES_COLLECTION = "usernames";

export type Profile = {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  username: string | null;
  createdAt: Date | null;
};

function toProfile(uid: string, data: DocumentData): Profile {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    uid,
    displayName: data.displayName ?? "",
    email: data.email ?? null,
    photoURL: data.photoURL ?? null,
    username: data.username ?? null,
    createdAt: createdAt?.toDate ? createdAt.toDate() : null,
  };
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snapshot = await getDoc(doc(db, PROFILES_COLLECTION, uid));
  return snapshot.exists() ? toProfile(snapshot.id, snapshot.data()) : null;
}

/** Writes `profiles/{uid}` the first time a user signs in — a no-op (via `merge`) on every
 * later sign-in, so it never clobbers a `username` claimed afterward. */
export async function ensureProfile(user: User): Promise<void> {
  await setDoc(
    doc(db, PROFILES_COLLECTION, user.uid),
    {
      displayName: user.displayName ?? "",
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Get-only lookup, mirroring `owetell_find_user_by_username`'s found/not-found shape —
 * `usernames/{username}` docs can't be listed (rules deny `list`, to stop enumeration). */
export async function findUserByUsername(
  username: string,
): Promise<{ found: true; uid: string } | { found: false }> {
  const snapshot = await getDoc(doc(db, USERNAMES_COLLECTION, username.trim().toLowerCase()));
  if (!snapshot.exists()) return { found: false };
  return { found: true, uid: snapshot.data().uid };
}

/**
 * Claims a username: creates `usernames/{username}` (fails if already taken — Firestore's
 * `create`-only rule on that collection means the write is simply rejected, surfaced here as
 * a friendly error) and stamps it onto the caller's own `profiles/{uid}`.
 */
export async function claimUsername(user: User, username: string): Promise<void> {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error("Usernames are 3-20 characters: letters, numbers, and underscores.");
  }

  try {
    await setDoc(doc(db, USERNAMES_COLLECTION, normalized), { uid: user.uid });
  } catch {
    throw new Error("That username is taken. Try another.");
  }
  await setDoc(doc(db, PROFILES_COLLECTION, user.uid), { username: normalized }, { merge: true });
}
