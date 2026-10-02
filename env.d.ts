// Types for the EXPO_PUBLIC_* vars in .env — gives process.env.* autocomplete.
// Keep this in sync with .env; unlike expo-env.d.ts, this file is hand-maintained.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_FIREBASE_API_KEY: string;
    readonly EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    readonly EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
    readonly EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    readonly EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly EXPO_PUBLIC_FIREBASE_APP_ID: string;
    readonly EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    readonly EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string | undefined;
    readonly EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string | undefined;
    readonly EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string | undefined;
  }
}
