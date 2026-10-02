import { makeRedirectUri, type AuthSessionResult } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExternalLink } from "@/components/external-link";
import { GoogleIcon } from "@/components/google-icon";
import { ReceiptIcon } from "@/components/tab-icons";
import { auth } from "@/config/firebase";
import {
  FontFamily,
  HeroCard,
  Palette,
  Radius,
  Shadow,
  Spacing,
} from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// The reversed iOS client ID (`com.googleusercontent.apps.<id>`). An iOS OAuth
// client always accepts this as a redirect URI regardless of the app's bundle
// ID, so pinning it here avoids the token-exchange `invalid_grant` you get when
// expo-auth-session's default `<bundleId>:/oauthredirect` isn't registered on
// the client. It must also be a CFBundleURLScheme (see app.json).
const IOS_REVERSED_CLIENT_ID = GOOGLE_IOS_CLIENT_ID
  ? `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(
      /\.apps\.googleusercontent\.com$/,
      "",
    )}`
  : undefined;

// iOS: pin the redirect URI so the auth request and the code exchange use the
// exact same value. Android/other: let the provider derive its default.
const GOOGLE_REDIRECT_URI =
  Platform.OS === "ios" && IOS_REVERSED_CLIENT_ID
    ? makeRedirectUri({ native: `${IOS_REVERSED_CLIENT_ID}:/oauthredirect` })
    : undefined;

type Tab = "login" | "register";

type AuthScreenProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  title: string;
  subtitle: string;
  onGoogleError: (message: string) => void;
  /** True while the email/password form is submitting. */
  busy?: boolean;
  children: ReactNode;
};

export function AuthScreen({
  activeTab,
  onTabChange,
  title,
  subtitle,
  onGoogleError,
  busy,
  children,
}: AuthScreenProps) {
  const [googleBusy, setGoogleBusy] = useState(false);

  // Native-only Google sign-in. Needs the per-platform OAuth client IDs in
  // .env (EXPO_PUBLIC_GOOGLE_{IOS,ANDROID}_CLIENT_ID); the web client ID is
  // still passed because expo-auth-session uses it for the id_token exchange
  // on Android.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ...(GOOGLE_REDIRECT_URI ? { redirectUri: GOOGLE_REDIRECT_URI } : {}),
  });

  // The session result can arrive through either channel: the promise
  // promptAsync() returns, or this hook's `response` — if iOS backgrounds the
  // app during the browser hop, the promise never settles and only `response`
  // fires. Take whichever lands first and ignore the duplicate.
  const handled = useRef<AuthSessionResult | null>(null);

  const finishGoogleSignIn = useCallback(
    async (result: AuthSessionResult | null) => {
      if (!result || handled.current === result) return;
      handled.current = result;

      // A prior attempt may have already signed us in (the navigator is
      // swapping out this screen) — never flash an error over a live session.
      if (auth.currentUser) {
        setGoogleBusy(false);
        return;
      }

      if (result.type !== "success") {
        setGoogleBusy(false);
        // 'cancel' / 'dismiss' mean the user backed out — stay quiet.
        if (result.type === "error") {
          const detail =
            result.params?.error_description ??
            result.error?.message ??
            result.params?.error;
          console.warn("[google] auth request error", result);
          onGoogleError(
            detail
              ? `Google sign-in failed: ${detail}`
              : "Google sign-in failed.",
          );
        }
        return;
      }

      const idToken = result.params?.id_token;
      if (!idToken) {
        setGoogleBusy(false);
        console.warn("[google] no id_token in response", result.params);
        onGoogleError(
          result.params?.error_description ??
            result.params?.error ??
            "Google returned no ID token. Check the OAuth client IDs in .env.",
        );
        return;
      }

      try {
        // Stays busy through the sign-in and the navigator swap that follows.
        await signInWithCredential(
          auth,
          GoogleAuthProvider.credential(idToken),
        );
      } catch (err) {
        setGoogleBusy(false);
        console.warn("[google] credential sign-in failed", err);
        // signInWithCredential can resolve the session (auth listener fires,
        // navigator swaps) and still reject on a follow-up call.
        if (auth.currentUser) return;
        if (err instanceof FirebaseError) {
          onGoogleError(
            err.code === "auth/operation-not-allowed"
              ? "Enable Google as a sign-in provider in the Firebase console."
              : `Google sign-in failed (${err.code}).`,
          );
          return;
        }
        onGoogleError(
          err instanceof Error ? err.message : "Google sign-in failed.",
        );
      }
    },
    [onGoogleError],
  );

  useEffect(() => {
    // Reacting to an external auth result is the documented expo-auth-session
    // pattern; the state updates happen in async continuations, not during
    // render, so the rule's re-render concern doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void finishGoogleSignIn(response);
  }, [response, finishGoogleSignIn]);

  async function handleGoogleLogin() {
    if (googleBusy || busy) return;
    if (!request) {
      onGoogleError("Google sign-in isn't configured for this platform yet.");
      return;
    }
    try {
      setGoogleBusy(true);
      // Fire and forget: the `response` effect is the single place that
      // consumes the result, so the promise and the hook state can't race
      // each other into reporting an error over a successful sign-in.
      await promptAsync();
    } catch (err) {
      console.warn("[google] sign-in threw", err);
      if (auth.currentUser) return; // sign-in actually worked; ignore the throw
      setGoogleBusy(false);
      onGoogleError(
        err instanceof Error ? err.message : "Google sign-in failed.",
      );
    }
  }

  const locked = busy || googleBusy;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[HeroCard.from, HeroCard.to]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardBrand}>
              <ReceiptIcon size={22} color={Palette.page} />
              <Text style={styles.cardWordmark}>owetell</Text>
            </View>
            <Text style={styles.cardHeadline}>
              who paid for what, silently settled.
            </Text>
            <Text style={styles.cardSubtext}>
              Split expenses with anyone, settle with clarity.
            </Text>
          </LinearGradient>

          <View style={styles.tabTrack}>
            {(["login", "register"] as Tab[]).map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => !locked && onTabChange(tab)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab === "login" ? "Login" : "Register"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={locked}
            style={({ pressed }) => [
              styles.google,
              locked && styles.googleDisabled,
              pressed && !locked && styles.pressed,
            ]}
          >
            {googleBusy ? (
              <ActivityIndicator size="small" color={Palette.muted} />
            ) : (
              <GoogleIcon />
            )}
            <Text style={styles.googleText}>
              {googleBusy ? "opening google…" : "continue with google"}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {children}

          <Text style={styles.footer}>
            By continuing, you agree to the{" "}
            <ExternalLink
              href="https://owetell.ninja/terms"
              style={styles.footerLink}
            >
              Terms
            </ExternalLink>{" "}
            and acknowledge the{" "}
            <ExternalLink
              href="https://owetell.ninja/privacy"
              style={styles.footerLink}
            >
              Privacy Policy
            </ExternalLink>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.page,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    borderRadius: 22,
    padding: Spacing.pad,
    minHeight: 200,
    justifyContent: "flex-end",
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  cardBrand: {
    position: "absolute",
    top: Spacing.pad,
    left: Spacing.pad,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  cardWordmark: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    color: Palette.page,
  },
  cardHeadline: {
    fontFamily: FontFamily.semibold,
    fontSize: 28,
    lineHeight: 35,
    color: Palette.page,
  },
  cardSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: HeroCard.body,
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.pill,
    padding: 5,
    gap: Spacing.one,
    marginBottom: Spacing.five,
  },
  tab: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: Palette.accent,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Palette.muted,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: 36,
    lineHeight: 42,
    color: Palette.ink,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.muted,
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    height: 56,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.pill,
    ...Shadow.sm,
  },
  googleDisabled: {
    opacity: 0.55,
  },
  googleText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Palette.ink,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    marginVertical: Spacing.five,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.line,
  },
  dividerText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    letterSpacing: 1,
    color: Palette.label,
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    fontFamily: FontFamily.regular,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: Palette.muted,
    marginTop: Spacing.six,
  },
  footerLink: {
    color: Palette.accent,
  },
});
