import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { initials } from '@/utils/currency';

/** Uppercase tracked label — the web's `.label` treatment. */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/** Lowercase section heading, e.g. "your rooms", "history by week". */
export function Heading({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

/** Monospaced numerals — every amount in the app uses this. */
export function Money({
  children,
  size = 16,
  color = Palette.ink,
  style,
  fit,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Keep the amount on one line, shrinking it to fit the available width. */
  fit?: boolean;
}) {
  return (
    <Text
      numberOfLines={fit ? 1 : undefined}
      adjustsFontSizeToFit={fit}
      minimumFontScale={0.6}
      style={[styles.money, { fontSize: size, lineHeight: size * 1.2, color }, style]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  raised,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
}) {
  return (
    <View style={[styles.card, raised ? styles.cardRaised : styles.cardFlat, style]}>
      {children}
    </View>
  );
}

const AVATAR_COLORS = ['#4f6b57', '#7a7264', '#8a6a4f', '#5a6b56', '#6c6252'];

export function Avatar({ name, size = 34, index = 0 }: { name: string; size?: number; index?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

export function AvatarStack({
  names,
  size = 34,
  onDark,
}: {
  names: string[];
  size?: number;
  onDark?: boolean;
}) {
  return (
    <View style={styles.stack}>
      {names.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={[
            index > 0 && { marginLeft: -size * 0.28 },
            styles.stackItem,
            { borderColor: onDark ? '#1c2c22' : Palette.page, borderRadius: size / 2 },
          ]}
        >
          <Avatar name={name} size={size} index={index} />
        </View>
      ))}
    </View>
  );
}

/** Emoji tile with a category tint, used on expense rows and subscriptions. */
export function EmojiTile({
  emoji,
  tint,
  size = 56,
}: {
  emoji: string;
  tint: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Radius.control, backgroundColor: tint },
      ]}
    >
      <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
    </View>
  );
}

/** Initial-letter tile with a tint, used on room cards in place of an emoji. */
export function InitialTile({
  label,
  tint,
  size = 56,
}: {
  label: string;
  tint: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Radius.control, backgroundColor: tint },
      ]}
    >
      <Text style={{ fontSize: size * 0.4, fontFamily: FontFamily.semibold, color: Palette.ink }}>
        {initials(label)}
      </Text>
    </View>
  );
}

export function Pill({
  children,
  background,
  color,
  style,
}: {
  children: ReactNode;
  background: string;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }, style]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

/** Segmented control — "you / group", "list / calendar", "tight / normal / wide". */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = 'accent',
  style,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  variant?: 'accent' | 'ink';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const activeBg = variant === 'accent' ? Palette.accent : Palette.ink;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: activeBg },
              pressed && !active && styles.pressed,
            ]}
          >
            {option.icon}
            <Text
              style={[
                styles.segmentText,
                { color: active ? '#ffffff' : variant === 'accent' ? Palette.accent : Palette.muted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Palette.label,
  },
  heading: {
    fontFamily: FontFamily.semibold,
    fontSize: 26,
    lineHeight: 32,
    color: Palette.ink,
  },
  money: {
    fontFamily: FontFamily.monoMedium,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.pad,
  },
  cardFlat: {
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  cardRaised: {
    backgroundColor: Palette.surface,
    ...Shadow.card,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.semibold,
    color: '#ffffff',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackItem: {
    borderWidth: 2,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Palette.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 5,
    gap: 2,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.four,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  segmentText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
});
