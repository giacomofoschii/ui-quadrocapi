import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import type { Board } from './types';

const STORAGE_KEY = 'quadrocapi_autosave';

type SavedBoardState = {
  version: 2;
  activeBoardId: string;
  boards: Board[];
};

export function useBoardPersistence(
  boards: Board[],
  activeBoardId: string,
  setBoards: Dispatch<SetStateAction<Board[]>>,
  setActiveBoardId: Dispatch<SetStateAction<string>>,
  dragStateRef: MutableRefObject<unknown>,
  isDrawingRef: MutableRefObject<boolean>,
  refreshKey: object
) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved) as Partial<SavedBoardState>;
          if (
            data.version === 2 &&
            Array.isArray(data.boards) &&
            data.boards.length > 0
          ) {
            setBoards(data.boards);
            setActiveBoardId(data.activeBoardId || data.boards[0].id);
          }
        }
      } catch (err) {
        console.error('Errore caricamento autosave', err);
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [setActiveBoardId, setBoards]);

  useEffect(() => {
    if (!isHydrated || dragStateRef.current !== null || isDrawingRef.current)
      return;

    const dataToSave: SavedBoardState = {
      version: 2,
      activeBoardId,
      boards,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    activeBoardId,
    boards,
    dragStateRef,
    isDrawingRef,
    isHydrated,
    refreshKey,
  ]);
}
