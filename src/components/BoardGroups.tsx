import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { GROUP_COLORS } from '../lib/constants';
import type { Card, Group } from '../lib/types';

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

type BoardGroupsProps = {
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

export function BoardGroups({
  groups,
  cards,
  editingGroupColor,
  setEditingGroupColor,
  setGroups,
  setCards,
  showConfirm,
  renderCard,
  dragStateRef,
}: BoardGroupsProps) {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none">
      {groups.map((group) => {
        const members = cards.filter((card) => card.groupId === group.id);
        return (
          <div
            key={group.id}
            data-group-id={group.id}
            className="absolute bg-[rgba(255,253,248,0.94)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] border border-black/10 flex flex-col pointer-events-auto min-w-[160px] min-h-[110px]"
            style={{
              left: group.x,
              top: group.y,
              width: group.w,
              height: group.h,
            }}
          >
            <div
              onPointerDown={(event) => {
                if (
                  (event.target as HTMLElement).tagName === 'BUTTON' ||
                  (event.target as HTMLElement).isContentEditable
                ) {
                  return;
                }
                event.preventDefault();
                dragStateRef.current = {
                  type: 'group',
                  id: group.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  origX: group.x,
                  origY: group.y,
                  moved: false,
                };
              }}
              className="flex items-center gap-[6px] p-[7px_8px_7px_12px] rounded-t-[10px] cursor-grab touch-none relative"
              style={{ backgroundColor: group.color }}
            >
              <div
                className="group-title flex-1 font-['Space_Grotesk'] font-bold text-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] outline-none cursor-text overflow-hidden text-ellipsis whitespace-nowrap focus:text-clip focus:bg-black/10 focus:rounded-[5px] focus:px-[4px] focus:mx-[-4px]"
                contentEditable
                suppressContentEditableWarning
                onBlur={(event) => {
                  const name =
                    event.currentTarget.textContent?.trim() || 'Nuova Staff';
                  setGroups((prev) =>
                    prev.map((currentGroup) =>
                      currentGroup.id === group.id
                        ? { ...currentGroup, name }
                        : currentGroup
                    )
                  );
                }}
              >
                {group.name}
              </div>
              <div className="group-count font-['Work_Sans'] text-[13px] font-semibold bg-black/20 px-[9px] py-[3px] rounded-[10px]">
                {members.length}
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingGroupColor(
                    editingGroupColor === group.id ? null : group.id
                  );
                }}
                className="group-icon-btn w-[24px] h-[24px] rounded-full bg-[rgba(0,0,0,0.15)] text-white text-[10px] flex items-center justify-center cursor-pointer border-none p-0 font-['Work_Sans']"
                title="Cambia colore"
              >
                ⬤
              </button>
              {editingGroupColor === group.id && (
                <div
                  className="absolute top-[calc(100%+6px)] right-[30px] p-[10px] bg-[#FFFdf8] rounded-[10px] shadow-[0_8px_20px_rgba(0,0,0,0.3)] border border-[#cfc4a8] z-[100] flex flex-wrap gap-[8px] w-[140px] cursor-default text-black"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setGroups((prev) =>
                          prev.map((currentGroup) =>
                            currentGroup.id === group.id
                              ? { ...currentGroup, color }
                              : currentGroup
                          )
                        );
                        setEditingGroupColor(null);
                      }}
                      className="w-[26px] h-[26px] rounded-full border-[1px] border-black/15 cursor-pointer hover:scale-110 transition-transform"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={async () => {
                  const confirmed = await showConfirm(
                    `Sei sicuro di voler rimuovere ${group.name}? I capi inseriti torneranno disponibili`
                  );
                  if (confirmed) {
                    setCards((prev) =>
                      prev.map((card) =>
                        card.groupId === group.id
                          ? {
                              ...card,
                              groupId: null,
                              px: undefined,
                              py: undefined,
                            }
                          : card
                      )
                    );
                    setGroups((prev) =>
                      prev.filter(
                        (currentGroup) => currentGroup.id !== group.id
                      )
                    );
                  }
                }}
                className="group-delete-btn w-[24px] h-[24px] rounded-full bg-[rgba(0,0,0,0.15)] text-white text-[14px] flex items-center justify-center font-bold cursor-pointer border-none p-0 hover:bg-[rgba(0,0,0,0.25)]"
              >
                ×
              </button>
            </div>
            <div data-group-content className="flex-1 relative overflow-hidden">
              {members.length === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-[10px] font-['Space_Grotesk'] text-[17px] text-[#9a917c] pointer-events-none">
                  Trascina qui un malcapitato
                </div>
              )}
              {members.map((card) => renderCard(card, true))}
            </div>
            <div
              onPointerDown={(event) => {
                event.stopPropagation();
                event.preventDefault();
                dragStateRef.current = {
                  type: 'resize',
                  id: group.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  origX: 0,
                  origY: 0,
                  origW: group.w,
                  origH: group.h,
                  moved: false,
                };
              }}
              className="absolute right-[2px] bottom-[2px] w-[18px] h-[18px] cursor-nwse-resize touch-none"
            >
              <div
                className="absolute right-[3px] bottom-[3px] w-[10px] h-[10px]"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, transparent 0 45%, #8a7a5a 45% 55%, transparent 55% 100%), linear-gradient(135deg, transparent 0 65%, #8a7a5a 65% 75%, transparent 75% 100%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
