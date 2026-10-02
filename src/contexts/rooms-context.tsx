import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '@/contexts/auth-context';
import type { Room } from '@/data/fixtures';
import { getRoomWithExpenses, listRooms } from '@/utils/rooms-api';

type RoomsContextValue = {
  rooms: Room[];
  loading: boolean;
  refresh: () => Promise<void>;
  createOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
  joinOpen: boolean;
  openJoin: () => void;
  closeJoin: () => void;
  /** The room the add-expense sheet targets, or `null` when it's closed. */
  addExpenseRoomId: string | null;
  openAddExpense: (roomId: string) => void;
  closeAddExpense: () => void;
  /** The room the settle-up sheet targets, or `null` when it's closed. */
  settleUpRoomId: string | null;
  openSettleUp: (roomId: string) => void;
  closeSettleUp: () => void;
};

const RoomsContext = createContext<RoomsContextValue | null>(null);

async function hydrateRooms(uid: string) {
  const records = await listRooms(uid);
  return Promise.all(records.map((record) => getRoomWithExpenses(record, uid)));
}

export function RoomsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [addExpenseRoomId, setAddExpenseRoomId] = useState<string | null>(null);
  const [settleUpRoomId, setSettleUpRoomId] = useState<string | null>(null);

  // Only for explicit, user-triggered refreshes (e.g. after creating a room
  // or adding an expense) — never call this from an effect, since its first
  // branch setState()s synchronously.
  const refresh = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setRooms(await hydrateRooms(user.uid));
    setLoading(false);
  }, [user]);

  // The initial/on-user-change load. Kept separate from `refresh` so this
  // effect body has no synchronous setState call of its own — every update
  // happens inside the `.then` continuation.
  useEffect(() => {
    let active = true;
    const load = user ? hydrateRooms(user.uid) : Promise.resolve([]);
    load.then((loaded) => {
      if (!active) return;
      setRooms(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        loading,
        refresh,
        createOpen,
        openCreate: () => setCreateOpen(true),
        closeCreate: () => setCreateOpen(false),
        joinOpen,
        openJoin: () => setJoinOpen(true),
        closeJoin: () => setJoinOpen(false),
        addExpenseRoomId,
        openAddExpense: (roomId) => setAddExpenseRoomId(roomId),
        closeAddExpense: () => setAddExpenseRoomId(null),
        settleUpRoomId,
        openSettleUp: (roomId) => setSettleUpRoomId(roomId),
        closeSettleUp: () => setSettleUpRoomId(null),
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error('useRooms must be used within a RoomsProvider');
  }
  return context;
}
