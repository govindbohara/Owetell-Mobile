import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
// `firebase/auth`'s package exports don't carry a "react-native" condition in
// this SDK version, so `getReactNativePersistence` resolves to undefined via
// that path — `@firebase/auth` (the underlying package) does, so import from
// there directly for native builds. Its published types still resolve to the
// generic build and omit this export even though it exists at runtime.
// @ts-expect-error -- see above, upstream typing gap in @firebase/auth
import { getReactNativePersistence, initializeAuth } from "@firebase/auth";
import { type Auth, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Fast Refresh re-runs this module, so guard against re-initializing.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Native (iOS/Android) needs an explicit persistence layer or Firebase falls
// back to in-memory auth state, silently signing users out on every reload.
// `initializeAuth` throws `auth/already-initialized` on the second run (Fast
// Refresh) — fall back to the existing instance in that case.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const db = getFirestore(app);
