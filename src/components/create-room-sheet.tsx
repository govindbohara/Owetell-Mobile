import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon, PlusIcon } from '@/components/tab-icons';
import { Heading, Label } from '@/components/ui';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { currencies } from '@/data/fixtures';
import { createRoom } from '@/utils/rooms-api';

export function CreateRoomSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCurrency('USD');
    setPickerOpen(false);
    setError(null);
  };

  const handleCreate = async () => {
    if (!user) {
      setError('You need to be signed in to create a room.');
      return;
    }
    if (!name.trim()) {
      setError('Enter a room name.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createRoom(user, { name, currencyCode: currency });
      reset();
      onClose();
      onCreated?.();
    } catch (err) {
      console.error('createRoom failed', err);
      setError(err instanceof Error ? err.message : "Couldn't create the room. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.pad }]}>
        <View style={styles.grabber} />

        <Label>New room</Label>
        <Heading style={styles.title}>create room</Heading>

        <Text style={styles.field}>room name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="bali trip"
          placeholderTextColor={Palette.faint}
          style={[styles.input, name.length > 0 && styles.inputFocused]}
        />

        <Text style={styles.field}>currency</Text>
        <Pressable style={styles.input} onPress={() => setPickerOpen((open) => !open)}>
          <Text style={styles.inputValue}>{currency}</Text>
          <View style={styles.caret}>
            <ChevronIcon size={20} color={Palette.muted} />
          </View>
        </Pressable>

        {pickerOpen && (
          <ScrollView style={styles.picker} nestedScrollEnabled>
            {currencies.map((code) => (
              <Pressable
                key={code}
                onPress={() => {
                  setCurrency(code);
                  setPickerOpen(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={styles.inputValue}>{code}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={submitting}
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.ctaPressed,
            submitting && styles.ctaDisabled,
          ]}
          onPress={handleCreate}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <PlusIcon size={22} color="#ffffff" />
              <Text style={styles.ctaText}>create room</Text>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 38, 28, 0.32)',
  },
  sheet: {
    backgroundColor: Palette.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.three,
    ...Shadow.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.line,
    marginBottom: Spacing.four,
  },
  title: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  field: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
    marginBottom: Spacing.two,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
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
  inputValue: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 19,
    color: Palette.ink,
  },
  caret: {
    transform: [{ rotate: '90deg' }],
  },
  picker: {
    maxHeight: 200,
    marginTop: -Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  option: {
    paddingHorizontal: Spacing.pad,
    paddingVertical: Spacing.three,
  },
  optionPressed: {
    backgroundColor: Palette.accentLight,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.neg,
    marginBottom: Spacing.three,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
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
