import { useEffect, useRef, useState, useCallback } from 'react';
import {
  acquireYjsRoom,
  releaseYjsRoom,
  updateYjsRoomAwareness,
  getYjsRoom,
  type YjsRoom,
} from '@/lib/yjsRoomManager';

export type { YjsRoom as YjsState };

interface UseYjsOptions {
  roomId: string;
  userName: string;
  userRole?: string;
}

export function useYjs({ roomId, userName, userRole }: UseYjsOptions): YjsRoom | null {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const userNameRef = useRef(userName);
  const userRoleRef = useRef(userRole);
  userNameRef.current = userName;
  userRoleRef.current = userRole;

  useEffect(() => {
    if (!roomId) return;

    acquireYjsRoom(
      roomId,
      userNameRef.current || 'Anonymous',
      userRoleRef.current || 'unknown',
      bump,
    );
    bump();

    return () => {
      releaseYjsRoom(roomId, bump);
    };
  }, [roomId, bump]);

  useEffect(() => {
    if (!roomId) return;
    updateYjsRoomAwareness(roomId, userName, userRole || 'unknown');
  }, [roomId, userName, userRole]);

  if (!roomId) return null;
  return getYjsRoom(roomId);
}
