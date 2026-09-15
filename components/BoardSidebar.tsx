import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';

import { SYMBOLS } from '../lib/constants';
import type { Card } from '../lib/types';

type BoardSidebarProps = {
  cards: Card[];
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  newCardSymbols: string[];
  setNewCardSymbols: Dispatch<SetStateAction<string[]>>;
  showCreationSymbols: boolean;
  setShowCreationSymbols: Dispatch<SetStateAction<boolean>>;
  renderCard: (card: Card, inGroup?: boolean) => ReactNode;
  onAddCard: (e: FormEvent) => void;
};

export function BoardSidebar({
  cards,
  inputValue,
  setInputValue,
  newCardSymbols,
  setNewCardSymbols,
  showCreationSymbols,
  setShowCreationSymbols,
  renderCard,
  onAddCard,
}: BoardSidebarProps) {
  return (
    <aside
      id="sidebar"
      className="w-[250px] min-w-[250px] flex flex-col p-[18px_14px_14px] shadow-[inset_-6px_0_14px_rgba(0,0,0,0.25)] z-20 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, var(--wood-light), var(--wood) 60%, var(--wood-dark))',
      }}
    >
      <h1 className="font-['Space_Grotesk'] font-bold text-[28px] text-[#FFF3DC] m-[2px_4px_12px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] leading-none">
        Malcapitati
      </h1>
      <form onSubmit={onAddCard} className="flex gap-[6px] mb-[14px] w-full">
        <input
          type="text"
          placeholder="Nome"
          maxLength={30}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 min-w-0 p-[9px_10px] rounded-[8px] border border-black/20 font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[var(--ink)] outline-none focus:outline-[2px] focus:outline-[#E8B84B]"
          style={{ width: 'calc(100% - 98px)' }}
        />
        <button
          type="submit"
          className="px-[14px] py-[8px] rounded-[8px] border-none bg-[#2F7A5C] text-white font-bold text-[14px] cursor-pointer active:translate-y-[1px] shrink-0 hover:bg-[#256249] w-[92px]"
        >
          Aggiungi
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowCreationSymbols(!showCreationSymbols)}
        className="w-full px-[14px] py-[8px] rounded-[8px] border-none text-white font-bold text-[14px] cursor-pointer active:translate-y-[1px] mb-[14px] transition-colors bg-[#2F7A5C] hover:bg-[#256249]"
      >
        Formazione
      </button>
      {showCreationSymbols && (
        <div className="flex gap-[8px] flex-wrap justify-center p-2.5 bg-white/10 rounded-[8px] mb-[14px]">
          {SYMBOLS.map((sym) => {
            const active = newCardSymbols.includes(sym);
            return (
              <button
                key={sym}
                type="button"
                onClick={() =>
                  setNewCardSymbols((prev) =>
                    active ? prev.filter((s) => s !== sym) : [...prev, sym]
                  )
                }
                className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[16px] cursor-pointer transition-all border symbol-formation-btn ${active ? 'bg-[#2a2a2a] font-bold shadow scale-105 border-[#2a2a2a]' : 'bg-white/20 border-transparent hover:bg-white/30'}`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      )}
      <div className="pool-label text-[12.5px] m-[0_4px_8px] font-medium">
        In che staff li mettiamo?
      </div>
      <div className="flex-1 overflow-y-auto p-[4px] flex flex-wrap content-start gap-[10px]">
        {cards.filter((c) => c.groupId === null).length === 0 ? (
          <div className="pool-empty font-['Space_Grotesk'] text-[15px] p-[20px_6px] w-full">
            I capi sono finiti.
            <br />
            Siamo stati bravi oppure siamo fottuti.
          </div>
        ) : (
          cards
            .filter((c) => c.groupId === null)
            .map((card) => renderCard(card, false))
        )}
      </div>
    </aside>
  );
}
