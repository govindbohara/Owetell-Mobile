import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoomCard } from '@/components/room-card';
import { PlusIcon } from '@/components/tab-icons';
import { Heading, Label, Money } from '@/components/ui';
import {
  BottomTabInset,
  FontFamily,
  HeroCard,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useRooms } from '@/contexts/rooms-context';
import { formatCents } from '@/utils/currency';

export default function Rooms() {
  const { rooms, loading, openCreate, openJoin } = useRooms();

  const totalCents = rooms.reduce((sum, room) => sum + room.position.balanceCents, 0);
  const weekCents = rooms.reduce((sum, room) => {
    const weeks = Object.keys(room.summary.weeks).sort();
    return sum + (room.summary.weeks[weeks[weeks.length - 1]] ?? 0);
  }, 0);
  const people = new Set(rooms.flatMap((room) => room.members.map((member) => member.id))).size;

  const settled = totalCents === 0;
  const owing = totalCents < 0;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Label>Ledger</Label>
        <Text style={styles.pageTitle}>rooms</Text>

        <LinearGradient
          colors={[HeroCard.from, HeroCard.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>TOTAL BALANCE</Text>
            <Money
              fit
              size={38}
              color={owing ? Palette.oweBright : Palette.owedBright}
            >
              {formatCents(totalCents)}
            </Money>
            <Text style={styles.heroCaption}>
              {settled ? "you're all settled" : owing ? 'you owe overall' : "you're owed overall"}
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroLabel}>THIS WEEK</Text>
              <Money size={22} color={Palette.page}>
                {formatCents(weekCents)}
              </Money>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivided]}>
              <Text style={styles.heroLabel}>PEOPLE</Text>
              <Money size={22} color={Palette.page}>
                {people}
              </Money>
            </View>
          </View>
        </LinearGradient>

        <Label style={styles.sectionLabel}>Open daily</Label>
        <View style={styles.sectionHead}>
          <Heading>your rooms</Heading>
          <View style={styles.headActions}>
            <Pressable
              onPress={openJoin}
              style={({ pressed }) => [styles.joinRoom, pressed && styles.pressed]}
            >
              <Text style={styles.joinRoomText}>join</Text>
            </Pressable>
            <Pressable
              onPress={openCreate}
              style={({ pressed }) => [styles.newRoom, pressed && styles.pressed]}
            >
              <PlusIcon size={20} color={Palette.ink} />
              <Text style={styles.newRoomText}>new room</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Palette.accent} style={styles.loading} />
        ) : rooms.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>no rooms yet</Text>
            <Text style={styles.emptyBody}>create one to start splitting expenses.</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={() => router.push(`/private/room/${room.id}`)}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  pageTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 52,
    lineHeight: 60,
    color: Palette.ink,
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.four,
    borderRadius: 22,
    padding: Spacing.pad,
  },
  heroMain: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  heroLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: HeroCard.label,
  },
  heroCaption: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: HeroCard.body,
  },
  heroStats: {
    width: 132,
    borderRadius: Radius.control,
    backgroundColor: HeroCard.inset,
    overflow: 'hidden',
  },
  heroStat: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  heroStatDivided: {
    borderTopWidth: 1,
    borderTopColor: HeroCard.divider,
  },
  sectionLabel: {
    marginTop: Spacing.six,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  headActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  joinRoom: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  joinRoomText: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.muted,
  },
  newRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  newRoomText: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.ink,
  },
  pressed: {
    opacity: 0.75,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.line,
    borderRadius: Radius.card,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.pad,
  },
  emptyTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    color: Palette.ink,
  },
  emptyBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
    textAlign: 'center',
  },
});
