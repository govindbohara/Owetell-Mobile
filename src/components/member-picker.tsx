import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { FontFamily, Palette, Radius, Spacing } from '@/constants/theme';
import type { Member } from '@/data/fixtures';

/** Single-select row of member chips — e.g. "who paid". */
export function MemberPicker({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {members.map((member, index) => {
        const active = member.id === value;
        return (
          <Pressable
            key={member.id}
            onPress={() => onChange(member.id)}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
          >
            <Avatar name={member.name} size={28} index={index} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {member.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Multi-select row of member chips — e.g. "split with", so a member who wasn't part of a
 * purchase can be left out even though they're in the room. When `amounts` is given, each
 * selected member's share (e.g. "A$3.50") shows right under their name. */
export function MemberMultiPicker({
  members,
  value,
  onChange,
  amounts,
}: {
  members: Member[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** memberId -> formatted share amount, shown under the name for selected members only. */
  amounts?: Record<string, string>;
}) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((entry) => entry !== id) : [...value, id]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {members.map((member, index) => {
        const active = value.includes(member.id);
        const amount = active ? amounts?.[member.id] : undefined;
        return (
          <Pressable
            key={member.id}
            onPress={() => toggle(member.id)}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
          >
            <Avatar name={member.name} size={28} index={index} />
            <View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {member.name}
              </Text>
              {amount && (
                <Text style={styles.amount} numberOfLines={1}>
                  {amount}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: Spacing.four,
  },
  row: {
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 160,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
  },
  chipActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentLight,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.ink,
  },
  labelActive: {
    color: Palette.accent,
    fontFamily: FontFamily.medium,
  },
  amount: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    color: Palette.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
