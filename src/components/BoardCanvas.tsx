import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from 'react';

import { BoardGroups } from '@/components/BoardGroups';
import type { Card, Group } from '@/lib/types';

type DragState = {
  type: 'group' | 'card' | 'resize';
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW?: number;
  origH?: number;
  moved: boolean;
};

type BoardCanvasProps = {
  boardRef: MutableRefObject<HTMLDivElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  currentTool: 'pencil' | 'eraser';
  currentColor: string | null;
  currentSize: number;
  cursorPos: { x: number; y: number } | null;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
  groups: Group[];
  cards: Card[];
  editingGroupColor: string | null;
  setEditingGroupColor: Dispatch<SetStateAction<string | null>>;
  setGroups: (updater: Group[] | ((prev: Group[]) => Group[])) => void;
  setCards: (updater: Card[] | ((prev: Card[]) => Card[])) => void;
  showConfirm: (message: string) => Promise<boolean>;
  renderCard: (card: Card, inGroup?: boolean) => React.ReactNode;
  dragStateRef: MutableRefObject<DragState | null>;
};

export function BoardCanvas({
  boardRef,
  canvasRef,
  currentTool,
  currentColor,
  currentSize,
  cursorPos,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  groups,
  cards,
  editingGroupColor,
  setEditingGroupColor,
  setGroups,
  setCards,
  showConfirm,
  renderCard,
  dragStateRef,
}: BoardCanvasProps) {
  return (
    <div
      ref={boardRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background:
          'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1.2px) 0 0/26px 26px, var(--board-bg)',
      }}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-0 ${currentTool === 'pencil' && !currentColor ? 'touch-pan-x touch-pan-y' : 'touch-none'}`}
        style={{
          cursor:
            currentTool === 'eraser'
              ? 'none'
              : currentTool === 'pencil' && currentColor
                ? 'crosshair'
                : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      />
      {currentTool === 'eraser' && cursorPos && (
        <div
          className="absolute z-[1] pointer-events-none"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: currentSize * 3,
            height: currentSize * 3,
            transform: 'translate(-50%, -50%)',
            border: '2px solid #3a2f1a',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
          }}
        />
      )}
      <BoardGroups
        groups={groups}
        cards={cards}
        editingGroupColor={editingGroupColor}
        setEditingGroupColor={setEditingGroupColor}
        setGroups={setGroups}
        setCards={setCards}
        showConfirm={showConfirm}
        renderCard={renderCard}
        dragStateRef={dragStateRef}
      />
    </div>
  );
}
