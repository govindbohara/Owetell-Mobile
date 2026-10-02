import { FirebaseError } from "firebase/app";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AuthScreen } from "@/components/auth-screen";
import { FontFamily, Palette, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { loginSchema, signupSchema } from "@/utils/auth-schema";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
};

function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return (
      AUTH_ERROR_MESSAGES[err.code] ??
      `Something went wrong (${err.code}). Please try again.`
    );
  }
  return err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}

type Mode = "login" | "register";

export default function Login() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === "login" || confirmPassword.length > 0) &&
    !submitting;

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
  }

  async function handleSubmit() {
    if (submitting) return;

    const result =
      mode === "login"
        ? loginSchema.safeParse({ email, password })
        : signupSchema.safeParse({ email, password, confirmPassword });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(result.data.email, result.data.password);
      } else {
        await signUp(result.data.email, result.data.password);
      }
      // On success the auth listener swaps the navigator; leave `submitting`
      // true so the button keeps its loading state through the transition.
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  function inputStyle(name: string) {
    return [
      styles.input,
      focused === name && styles.inputFocused,
      submitting && styles.inputMuted,
    ];
  }

  return (
    <AuthScreen
      activeTab={mode}
      onTabChange={handleModeChange}
      title={mode === "login" ? "log in" : "sign up"}
      subtitle={mode === "login" ? "welcome back" : "create your account"}
      onGoogleError={setError}
      busy={submitting}
    >
      <View style={styles.field}>
        <Text style={styles.label}>email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          placeholder="you@example.com"
          placeholderTextColor={Palette.faint}
          style={inputStyle("email")}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          autoCapitalize="none"
          secureTextEntry
          textContentType={mode === "login" ? "password" : "newPassword"}
          returnKeyType={mode === "login" ? "done" : "next"}
          onSubmitEditing={mode === "login" ? handleSubmit : undefined}
          placeholder="••••••••"
          placeholderTextColor={Palette.faint}
          style={inputStyle("password")}
        />
      </View>

      {mode === "register" && (
        <View style={styles.field}>
          <Text style={styles.label}>confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!submitting}
            onFocus={() => setFocused("confirm")}
            onBlur={() => setFocused(null)}
            autoCapitalize="none"
            secureTextEntry
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            placeholder="••••••••"
            placeholderTextColor={Palette.faint}
            style={inputStyle("confirm")}
          />
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.submit,
          !canSubmit && styles.submitDisabled,
          pressed && canSubmit && styles.submitPressed,
        ]}
      >
        {submitting && <ActivityIndicator size="small" color="#ffffff" />}
        <Text style={styles.submitText}>
          {submitting
            ? mode === "login"
              ? "logging in…"
              : "signing up…"
            : mode === "login"
              ? "log in"
              : "sign up"}
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Palette.muted,
  },
  input: {
    height: 56,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
  },
  inputFocused: {
    borderColor: Palette.accent,
  },
  inputMuted: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: Palette.negBg,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Palette.neg,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    height: 56,
    backgroundColor: Palette.accent,
    borderRadius: Radius.pill,
    marginTop: Spacing.two,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitPressed: {
    backgroundColor: Palette.accentHover,
  },
  submitText: {
    fontFamily: FontFamily.semibold,
    fontSize: 17,
    color: "#ffffff",
  },
});
