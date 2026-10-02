import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Heading, Label } from '@/components/ui';
import { FontFamily, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { claimUsername } from '@/utils/profile-api';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await claimUsername(user, username);
      await refreshProfile();
    } catch (err) {
      console.error('claimUsername failed', err);
      setError(err instanceof Error ? err.message : "Couldn't save that username. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.pad }]}>
      <View style={styles.content}>
        <Label>One more thing</Label>
        <Heading style={styles.title}>pick a username</Heading>
        <Text style={styles.body}>
          Other people can find you by this to share a personal subscription with you. Letters, numbers, and
          underscores only.
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="yourname"
          placeholderTextColor={Palette.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, username.length > 0 && styles.inputFocused]}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={submitting}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, submitting && styles.ctaDisabled]}
          onPress={handleSubmit}
        >
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.ctaText}>continue</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Palette.page,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.pad,
  },
  title: {
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
    fontSize: 34,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
    marginBottom: Spacing.five,
  },
  input: {
    height: 62,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: Spacing.pad,
    marginBottom: Spacing.four,
    fontFamily: FontFamily.regular,
    fontSize: 19,
    color: Palette.ink,
  },
  inputFocused: {
    borderColor: Palette.accent,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.neg,
    marginBottom: Spacing.three,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 66,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  ctaPressed: {
    backgroundColor: Palette.accentHover,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    color: '#ffffff',
  },
});
