type BoardTabsProps = {
  boards: { id: string; name: string }[];
  activeBoardId: string;
  tabMenuOpen: { id: string; left: number; bottom: number } | null;
  onSwitchBoard: (id: string) => void;
  onTabMenuClick: (e: React.MouseEvent, id: string) => void;
  onAddBoard: () => void;
  onRenameBoard: (id: string) => void;
  onDuplicateBoard: (id: string) => void;
  onDeleteBoard: (id: string) => void;
};

const TAB_INACTIVE_CLASS =
  "flex items-center justify-between gap-[6px] px-[12px] py-[6px] rounded-[6px] border border-[rgba(0,0,0,0.25)] bg-[rgba(255,255,255,0.65)] font-['Work_Sans'] font-bold text-[13px] text-[#3a2f1a] cursor-pointer backdrop-blur-[4px] hover:bg-[rgba(255,255,255,0.85)] hover:border-[rgba(0,0,0,0.4)] transition-all duration-200";

const TAB_ACTIVE_CLASS =
  "flex items-center justify-between gap-[6px] px-[12px] py-[6px] rounded-[6px] border border-[rgba(0,0,0,0.5)] bg-[#FAF8F4] font-['Work_Sans'] font-bold text-[13px] text-[#232323] cursor-pointer backdrop-blur-[4px] shadow-md transition-all duration-200 scale-[1.02] z-10";

const TAB_DROPDOWN_CLASS =
  'dropdown-menu fixed bg-[rgba(255,255,255,0.85)] border border-[rgba(0,0,0,0.3)] shadow-2xl rounded-xl p-1.5 flex flex-col min-w-[200px] z-[10000] backdrop-blur-[4px]';

const TAB_MENU_ITEM_CLASS =
  "menu-item flex items-center gap-[6px] px-[12px] py-[6px] hover:bg-[rgba(0,0,0,0.08)] rounded-[6px] cursor-pointer font-['Work_Sans'] font-bold text-[13px] text-[#3a2f1a] transition-all duration-200 text-left w-full";

export function BoardTabs({
  boards,
  activeBoardId,
  tabMenuOpen,
  onSwitchBoard,
  onTabMenuClick,
  onAddBoard,
  onRenameBoard,
  onDuplicateBoard,
  onDeleteBoard,
}: BoardTabsProps) {
  return (
    <>
      <div className="flex items-center h-[54px] bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-t-[2px] border-black/35 shadow-[0_-2px_8px_rgba(0,0,0,0.3)] pl-[24px] pr-4 gap-[8px] shrink-0 overflow-x-auto select-none relative z-[30]">
        {boards.map((b) => (
          <div
            key={b.id}
            onClick={() => onSwitchBoard(b.id)}
            className={`group relative min-w-[120px] max-w-[200px] ${activeBoardId === b.id ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
          >
            <span className="truncate flex-1">{b.name}</span>
            <button
              onClick={(e) => onTabMenuClick(e, b.id)}
              className="ml-1 flex items-center justify-center rounded-[4px] hover:bg-[rgba(0,0,0,0.08)] opacity-40 group-hover:opacity-100 transition-opacity"
              title="Opzioni foglio"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        ))}

        <button
          onClick={onAddBoard}
          className="ml-2 flex items-center justify-center px-[12px] py-[6px] rounded-[6px] border border-[rgba(0,0,0,0.25)] bg-[rgba(255,255,255,0.65)] text-[#3a2f1a] font-bold text-[16px] cursor-pointer backdrop-blur-[4px] hover:bg-[rgba(255,255,255,0.85)] hover:border-[rgba(0,0,0,0.4)] transition-all duration-200 shrink-0 shadow-sm"
          title="Aggiungi nuova lavagna"
          style={{ lineHeight: '13px' }}
        >
          +
        </button>
      </div>

      {tabMenuOpen && (
        <div
          className={TAB_DROPDOWN_CLASS}
          style={{ left: tabMenuOpen.left, bottom: tabMenuOpen.bottom }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRenameBoard(tabMenuOpen.id);
            }}
            className={TAB_MENU_ITEM_CLASS}
          >
            Rinomina
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateBoard(tabMenuOpen.id);
            }}
            className={TAB_MENU_ITEM_CLASS}
          >
            Duplica
          </button>
          {boards.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteBoard(tabMenuOpen.id);
              }}
              className={`${TAB_MENU_ITEM_CLASS} !text-[#b23b2e] hover:!bg-[rgba(178,59,46,0.1)] mt-1`}
            >
              Elimina
            </button>
          )}
        </div>
      )}
    </>
  );
}
