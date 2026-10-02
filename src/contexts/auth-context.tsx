import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "@/config/firebase";
import { ensureProfile, getProfile, type Profile } from "@/utils/profile-api";

type AuthContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  initializing: boolean;
  profile: Profile | null;
  /** True once `profile` has loaded (or immediately, when signed out) — gates the
   * onboarding redirect so it doesn't flash before the profile doc is fetched. */
  profileLoaded: boolean;
  /** Signed in, profile loaded, and no username claimed yet. */
  needsUsername: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  // Loads (and, on first sign-in, creates) the signed-in user's profile doc. Kept separate
  // from the auth-state effect above so every setState here happens inside a promise
  // continuation, matching the rest of this codebase's effect conventions.
  useEffect(() => {
    let active = true;
    const load = user ? ensureProfile(user).then(() => getProfile(user.uid)) : Promise.resolve(null);
    load.then((loaded) => {
      if (!active) return;
      setProfile(loaded);
      setProfileLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        initializing,
        profile,
        profileLoaded,
        needsUsername: !!user && profileLoaded && !profile?.username,
        refreshProfile: async () => {
          if (!user) return;
          setProfile(await getProfile(user.uid));
        },
        signIn: async (email, password) => {
          await signInWithEmailAndPassword(auth, email, password);
        },
        signUp: async (email, password) => {
          await createUserWithEmailAndPassword(auth, email, password);
        },
        signOut: () => firebaseSignOut(auth),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
