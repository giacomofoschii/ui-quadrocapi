'use client';

import { useState } from 'react';

type Card = {
  id: string;
  name: string;
  groupId: string | null;
};

// Aggiungiamo il tipo per i Gruppi
type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

const GROUP_COLORS = ['#E8B324','#2F7A5C','#C1440E','#6B4C8A','#2E6E9E','#B23B7E'];

export default function QuadroCapiApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [inputValue, setInputValue] = useState('');

  // --- LOGICA CARTELLINI ---
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newCard: Card = {
      id: Math.random().toString(36).substring(2, 9),
      name: inputValue.trim(),
      groupId: null,
    };
    setCards([...cards, newCard]);
    setInputValue('');
  };

  const handleRemoveCard = (id: string) => {
    setCards(cards.filter((card) => card.id !== id));
  };

  // --- LOGICA GRUPPI E DRAG & DROP ---
  const handleAddGroup = () => {
    const n = groups.length;
    const newGroup: Group = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'Nuovo gruppo',
      color: GROUP_COLORS[n % GROUP_COLORS.length],
      x: 30 + (n % 4) * 40,
      y: 30 + (n % 4) * 30,
    };
    setGroups([...groups, newGroup]);
  };

  const handleRemoveGroup = (groupId: string) => {
    // 1. Riportiamo i cartellini di questo gruppo nel "pool" (groupId: null)
    setCards(cards.map(c => c.groupId === groupId ? { ...c, groupId: null } : c));
    // 2. Eliminiamo il gruppo
    setGroups(groups.filter(g => g.id !== groupId));
  };

  // Quando inizio a trascinare, mi salvo l'ID del cartellino
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  // Necessario per permettere il "rilascio" (Drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Quando rilascio il cartellino, aggiorno il suo groupId
  const handleDrop = (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      setCards(cards.map(c => c.id === cardId ? { ...c, groupId: targetGroupId } : c));
    }
  };

  const unassignedCards = cards.filter((c) => c.groupId === null);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      
      <div className="w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-2 border-black/35 shadow-md shrink-0">
        <div className="flex w-max animate-[marquee_7s_linear_infinite]">
          <span className="inline-block whitespace-nowrap py-2 px-12 font-['Space_Grotesk'] font-bold text-[22px] text-[#FFF3DC] drop-shadow-md">Il grande gioco del quadro capi</span>
          <span className="inline-block whitespace-nowrap py-2 px-12 font-['Space_Grotesk'] font-bold text-[22px] text-[#FFF3DC] drop-shadow-md" aria-hidden="true">Il grande gioco del quadro capi</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        
        {/* SIDEBAR (Zona Drop per rimettere i capi nel pool) */}
        <aside 
          className="w-[250px] min-w-[250px] flex flex-col p-[18px_14px_14px] shadow-[-6px_0_14px_rgba(0,0,0,0.25)_inset]" 
          style={{ background: 'linear-gradient(160deg, var(--wood-light), var(--wood) 60%, var(--wood-dark))' }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <h1 className="font-['Space_Grotesk'] font-bold text-[28px] text-[#FFF3DC] m-[2px_4px_12px] drop-shadow-md leading-none">Malcapitati</h1>
          
          <form onSubmit={handleAddCard} className="flex gap-1.5 mb-3.5">
            <input type="text" placeholder="Nome…" maxLength={30} autoComplete="off" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-black/20 font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#E8B84B]" />
            <button type="submit" className="px-3.5 rounded-lg border-none bg-[#2F7A5C] text-white font-semibold text-sm cursor-pointer">Aggiungi</button>
          </form>

          <div className="text-white/75 text-[12.5px] m-[0_4px_8px] font-medium">In che staff li mettiamo?</div>
          
          <div className="flex-1 overflow-y-auto p-1 flex flex-wrap content-start gap-2.5 touch-pan-y">
            {unassignedCards.length === 0 ? (
              <div className="text-white/60 font-['Space_Grotesk'] text-[15px] p-[20px_6px] w-full">I capi sono finiti.</div>
            ) : (
              unassignedCards.map((card) => (
                <div 
                  key={card.id} 
                  draggable // <-- Rende l'elemento trascinabile
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  className="relative bg-[var(--tag-bg)] border border-[var(--tag-border)] rounded-lg p-[12px_30px_12px_20px] font-['Space_Grotesk'] font-semibold text-[20px] text-[#3a2f1a] shadow-[0_3px_6px_var(--shadow)] cursor-grab active:cursor-grabbing leading-tight max-w-[240px] break-words"
                >
                  <div className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#b9a878_70%)] shadow-[inset_0_0_1px_rgba(0,0,0,0.4)]" />
                  {card.name}
                  <button onClick={() => handleRemoveCard(card.id)} className="absolute top-[3px] right-[4px] w-[20px] h-[20px] leading-[20px] text-center rounded-full font-['Work_Sans'] text-[15px] font-bold text-[#8a7a4a] hover:text-[#b23b2e]">×</button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* BOARD AREA */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          
          <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-sm z-10 flex-wrap">
            <button onClick={handleAddGroup} className="px-3 py-1.5 rounded-lg border border-[#2E6E9E] bg-[#2E6E9E] text-white font-semibold text-sm active:translate-y-px cursor-pointer">
              + Nuovo gruppo
            </button>
          </div>

          {/* Sfondo lavagna (Zona Drop per i capi, se li "cadi" fuori dai gruppi tornano nel pool) */}
          <div 
            className="relative flex-1 overflow-hidden" 
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1.2px) 0 0/26px 26px, var(--board-bg)' }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {groups.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-['Space_Grotesk'] pointer-events-none">
                Aggiungi un nuovo gruppo per iniziare
              </div>
            )}

            {/* Renderizziamo i Gruppi */}
            {groups.map((group) => {
              // Peschiamo i membri di questo specifico gruppo
              const members = cards.filter(c => c.groupId === group.id);

              return (
                <div 
                  key={group.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.stopPropagation(); // Evita che l'evento arrivi alla lavagna sottostante
                    handleDrop(e, group.id);
                  }}
                  className="absolute bg-[#FFFDF8]/95 rounded-xl shadow-lg border border-black/10 flex flex-col min-w-[200px] min-h-[140px]"
                  style={{ left: group.x, top: group.y }}
                >
                  {/* Header Gruppo */}
                  <div className="flex items-center gap-2 p-[7px_8px_7px_12px] rounded-t-xl" style={{ backgroundColor: group.color }}>
                    <div className="flex-1 font-['Space_Grotesk'] font-bold text-[20px] text-white drop-shadow-sm outline-none cursor-text truncate" contentEditable suppressContentEditableWarning>
                      {group.name}
                    </div>
                    <div className="font-['Work_Sans'] text-[13px] font-semibold text-white/90 bg-black/20 px-2 py-0.5 rounded-lg">
                      {members.length}
                    </div>
                    <button onClick={() => handleRemoveGroup(group.id)} className="w-6 h-6 rounded-full bg-black/15 text-white flex items-center justify-center font-bold hover:bg-black/30">
                      ×
                    </button>
                  </div>

                  {/* Corpo Gruppo */}
                  <div className="flex-1 relative p-3 flex flex-wrap content-start gap-2 overflow-hidden">
                    {members.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center font-['Space_Grotesk'] text-[15px] text-[#9a917c] text-center px-2 pointer-events-none">
                        Trascina qui un malcapitato
                      </div>
                    ) : (
                      members.map((card) => (
                        <div 
                          key={card.id} 
                          draggable 
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          className="relative bg-[var(--tag-bg)] border border-[var(--tag-border)] rounded-lg p-[8px_24px_8px_16px] font-['Space_Grotesk'] font-semibold text-[18px] text-[#3a2f1a] shadow-sm cursor-grab active:cursor-grabbing leading-tight"
                        >
                          <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#b9a878_70%)] shadow-[inset_0_0_1px_rgba(0,0,0,0.4)]" />
                          {card.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </main>
      </div>
    </div>
  );
}
