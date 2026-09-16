import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from 'react';
import type { Session } from 'next-auth';

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
  onAddGroup: () => void;
  onExportPNG: () => void | Promise<void>;
  onImportJSON: (e: ChangeEvent<HTMLInputElement>) => void;
  onLoadDrive: () => void | Promise<void>;
  onSaveJSON: () => void;
  onSaveDrive: () => void | Promise<void>;
  session: Session | null;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
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
  onAddGroup,
  onExportPNG,
  onImportJSON,
  onLoadDrive,
  onSaveJSON,
  onSaveDrive,
  session,
  onSignIn,
  onSignOut,
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
      <div className="mobile-sidebar-actions" aria-label="Azioni lavagna">
        <button type="button" onClick={onAddGroup}>
          ➕ Nuova Staff
        </button>
        <button type="button" onClick={onExportPNG}>
          📸 Esporta PNG
        </button>
        <label>
          📂 Carica da PC
          <input
            type="file"
            accept=".json"
            onChange={onImportJSON}
            className="hidden"
          />
        </label>
        <button type="button" onClick={onLoadDrive} disabled={!session}>
          ☁️ Carica da Drive
        </button>
        <button type="button" onClick={onSaveJSON}>
          💾 Salva in locale
        </button>
        <button type="button" onClick={onSaveDrive} disabled={!session}>
          💾 Salva su Drive
        </button>
      </div>
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
      {/* ---------- AREA LOGIN (IN FONDO ALLA SIDEBAR) ---------- */}
      <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.15)] shrink-0">
        {session ? (
          <div className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[6px] border border-[rgba(255,255,255,0.4)] bg-[rgba(0,0,0,0.4)] font-['Work_Sans'] font-bold text-[13px] text-white backdrop-blur-[4px] shadow-sm">
            <div
              role="img"
              aria-label="Profilo"
              className="w-[24px] h-[24px] rounded-full shadow-sm bg-black/20 bg-cover bg-center shrink-0"
              style={{
                backgroundImage: session.user?.image
                  ? `url(${session.user.image})`
                  : undefined,
              }}
            />
            <span
              className="flex-1 text-center truncate font-['Work_Sans'] font-bold text-[13px]"
              style={{ color: '#FFFFFF' }}
            >
              {session.user?.name}
            </span>
            <button
              onClick={onSignOut}
              className="w-[24px] h-[24px] flex items-center justify-center font-bold text-[16px] cursor-pointer bg-transparent border-none text-[#8a7a4a] hover:text-[#b23b2e] transition-colors shrink-0 p-0"
              title="Logout"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-[8px] px-[12px] py-[8px] rounded-[6px] border border-[rgba(255,255,255,0.4)] bg-[rgba(0,0,0,0.4)] font-['Work_Sans'] font-bold text-[13px] text-white cursor-pointer backdrop-blur-[4px] hover:bg-[rgba(0,0,0,0.7)] hover:border-[rgba(255,255,255,0.8)] transition-all duration-200 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              width="16px"
              height="16px"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Accedi con Google
          </button>
        )}
      </div>
    </aside>
  );
}
