import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalyticsIcon, PlusIcon, ReceiptIcon, SubsIcon } from '@/components/tab-icons';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';

const ICONS = {
  index: ReceiptIcon,
  subs: SubsIcon,
  analytics: AnalyticsIcon,
} as const;

const LABELS = {
  index: 'rooms',
  subs: 'subs',
  analytics: 'analytics',
} as const;

type RouteName = keyof typeof ICONS;

export function FloatingTabBar({
  state,
  navigation,
  onAdd,
}: BottomTabBarProps & { onAdd?: (roomId?: string) => void }) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => route.name in ICONS);
  const currentRoute = state.routes[state.index];
  const currentName = currentRoute.name;
  // A room detail screen still belongs to the rooms tab, but the "+" button
  // there should add an expense to that room instead of opening "new room".
  const activeName = currentName in ICONS ? currentName : 'index';
  const activeRoomId =
    currentName === 'room/[id]' ? (currentRoute.params as { id?: string } | undefined)?.id : undefined;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {routes.map((route) => {
          const name = route.name as RouteName;
          const Icon = ICONS[name];
          const active = route.name === activeName;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Icon size={22} color={active ? Palette.accent : Palette.muted} />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeName === 'index' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          onPress={() => onAdd?.(activeRoomId)}
          style={({ pressed }) => [styles.fabShadow, pressed && styles.fabPressed]}
        >
          <LinearGradient
            colors={['#c9a4f2', '#9640e0']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.fab}
          >
            <PlusIcon size={30} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 250, 240, 0.94)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.hairline,
    paddingVertical: Spacing.two,
    ...Shadow.card,
  },
  tab: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
  },
  iconWrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  iconWrapActive: {
    backgroundColor: Palette.accentLight,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.muted,
  },
  labelActive: {
    color: Palette.accent,
  },
  fabShadow: {
    borderRadius: 32,
    ...Shadow.lg,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.85,
  },
});
