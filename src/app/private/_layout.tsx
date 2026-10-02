import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AddExpenseSheet } from '@/components/add-expense-sheet';
import { AppHeader } from '@/components/app-header';
import { CreateRoomSheet } from '@/components/create-room-sheet';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { JoinRoomSheet } from '@/components/join-room-sheet';
import { SettleUpSheet } from '@/components/settle-up-sheet';
import { Palette } from '@/constants/theme';
import { RoomsProvider, useRooms } from '@/contexts/rooms-context';

export default function PrivateLayout() {
  return (
    <RoomsProvider>
      <PrivateLayoutContent />
    </RoomsProvider>
  );
}

function PrivateLayoutContent() {
  const { createOpen, openCreate, closeCreate, openAddExpense, refresh } = useRooms();

  return (
    <View style={styles.root}>
      <AppHeader />

      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: styles.scene }}
        tabBar={(props) => (
          <FloatingTabBar
            {...props}
            onAdd={(roomId) => (roomId ? openAddExpense(roomId) : openCreate())}
          />
        )}
      >
        <Tabs.Screen name="index" options={{ title: 'rooms' }} />
        <Tabs.Screen name="subs" options={{ title: 'subs' }} />
        <Tabs.Screen name="analytics" options={{ title: 'analytics' }} />
        <Tabs.Screen name="room/[id]" options={{ href: null }} />
      </Tabs>

      <CreateRoomSheet visible={createOpen} onClose={closeCreate} onCreated={refresh} />
      <AddExpenseSheet />
      <SettleUpSheet />
      <JoinRoomSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.page,
  },
  scene: {
    backgroundColor: Palette.page,
  },
});
