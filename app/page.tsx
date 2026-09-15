'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Card = {
  id: string;
  name: string;
  groupId: string | null;
  symbols: string[];
};

type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

const COLORS = [
  '#232323',
  '#E8B324',
  '#2F7A5C',
  '#C1440E',
  '#6B4C8A',
  '#2E6E9E',
  '#B23B7E',
];
const GROUP_COLORS = [
  '#E8B324',
  '#2F7A5C',
  '#C1440E',
  '#6B4C8A',
  '#2E6E9E',
  '#B23B7E',
];
const SYMBOLS = ['T', '🎓', '⛺', '🐺', '🥾', '🧙'];

export default function QuadroCapiApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Stati per la Sidebar
  const [inputValue, setInputValue] = useState('');
  const [newCardSymbols, setNewCardSymbols] = useState<string[]>([]);

  // Stato per quale cartellino stiamo modificando i simboli
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // --- STATO DEL CANVAS E STRUMENTI ---
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentSize, setCurrentSize] = useState(4);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser'>('pencil');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);

  // --- INIZIALIZZAZIONE E RESIZE DEL CANVAS ---
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const tempCanvas = document.createElement('canvas');
    if (canvas.width > 0 && canvas.height > 0) {
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tempCanvas.width > 0) {
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, []);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    return () => window.removeEventListener('resize', sizeCanvas);
  }, [sizeCanvas]);

  // --- FUNZIONI DI DISEGNO ---
  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== undefined) return;
    isDrawing.current = true;
    const ctx = ctxRef.current;
    if (!ctx) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);
    const dpr = window.devicePixelRatio || 1;

    ctx.globalCompositeOperation =
      currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth =
      (currentTool === 'eraser' ? currentSize * 3 : currentSize) * dpr;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing.current || !ctxRef.current) return;
    const pos = getPos(e);
    ctxRef.current.lineTo(pos.x, pos.y);
    ctxRef.current.stroke();
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    ctxRef.current?.beginPath();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const clearCanvas = () => {
    if (confirm('Cancellare tutti i disegni sulla lavagna?')) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // --- LOGICA CARTELLINI ---
  const toggleNewCardSymbol = (sym: string) => {
    setNewCardSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newCard: Card = {
      id: Math.random().toString(36).substring(2, 9),
      name: inputValue.trim(),
      groupId: null,
      symbols: [...newCardSymbols],
    };
    setCards([...cards, newCard]);
    setInputValue('');
    setNewCardSymbols([]); // Resetta i simboli dopo aver creato
  };

  const handleRemoveCard = (id: string) => {
    setCards(cards.filter((card) => card.id !== id));
  };

  const toggleSymbolOnCard = (cardId: string, symbol: string) => {
    setCards(
      cards.map((c) => {
        if (c.id !== cardId) return c;
        const hasSym = c.symbols.includes(symbol);
        return {
          ...c,
          symbols: hasSym
            ? c.symbols.filter((s) => s !== symbol)
            : [...c.symbols, symbol],
        };
      })
    );
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
    setCards(
      cards.map((c) => (c.groupId === groupId ? { ...c, groupId: null } : c))
    );
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    setEditingCardId(null); // Chiude il menu se inizio a trascinare
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) {
      setCards(
        cards.map((c) =>
          c.id === cardId ? { ...c, groupId: targetGroupId } : c
        )
      );
    }
  };

  const unassignedCards = cards.filter((c) => c.groupId === null);

  // Componente riutilizzabile per il Cartellino
  const renderCard = (card: Card, inGroup: boolean = false) => (
    <div
      key={card.id}
      draggable
      onDragStart={(e) => handleDragStart(e, card.id)}
      className={`relative bg-[var(--tag-bg)] border border-[var(--tag-border)] rounded-lg p-[12px_30px_16px_20px] font-['Space_Grotesk'] font-semibold text-[20px] text-[#3a2f1a] shadow-[0_3px_6px_var(--shadow)] cursor-grab active:cursor-grabbing touch-none leading-tight max-w-[240px] break-words ${inGroup ? 'absolute' : ''}`}
      style={inGroup ? { left: card.groupId ? undefined : 0, top: 0 } : {}} // Logica di posizionamento semplificata per ora
    >
      <div className="absolute left-[8px] top-[14px] w-[9px] h-[9px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#b9a878_70%)] shadow-[inset_0_0_1px_rgba(0,0,0,0.4)]" />

      {card.name}

      {/* Render dei Simboli Scelti */}
      {card.symbols.length > 0 && (
        <div className="absolute left-[12px] bottom-[4px] flex gap-1 items-center pointer-events-none">
          {card.symbols.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-[5px] bg-white/70 text-[14px] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
            >
              {sym}
            </span>
          ))}
        </div>
      )}

      {/* Tasto Rimuovi Card */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveCard(card.id);
        }}
        className="absolute top-[3px] right-[4px] w-[20px] h-[20px] leading-[20px] text-center rounded-full font-['Work_Sans'] text-[15px] font-bold text-[#8a7a4a] bg-transparent border-none cursor-pointer hover:text-[#b23b2e]"
      >
        ×
      </button>

      {/* Tasto Modifica Simboli (+) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditingCardId(editingCardId === card.id ? null : card.id);
        }}
        className="absolute bottom-[4px] right-[4px] w-[20px] h-[20px] bg-black/5 text-black/50 rounded flex items-center justify-center font-bold text-[14px] hover:bg-black/15 transition-colors cursor-pointer"
        title="Modifica Formazione"
      >
        {editingCardId === card.id ? 'v' : '+'}
      </button>

      {/* Menu a comparsa per scegliere i simboli */}
      {editingCardId === card.id && (
        <div
          className="absolute top-[105%] left-0 p-1.5 bg-[#FFFdf8] rounded-lg shadow-xl border border-[#c9bd9c] z-[100] flex gap-1 cursor-default pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()} // Evita che si inizi a trascinare la card
        >
          {SYMBOLS.map((sym) => {
            const isActive = card.symbols.includes(sym);
            return (
              <button
                key={sym}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSymbolOnCard(card.id, sym);
                }}
                className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[16px] cursor-pointer transition-colors ${isActive ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#f3efe6] hover:bg-[#e9e2d2] text-[#3a2f1a]'}`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      onClick={() => setEditingCardId(null)}
    >
      {/* ---------- BANNER CON LOGO ---------- */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-2 border-black/35 shadow-md shrink-0 z-20 relative flex items-center">
        <div className="pl-4 py-1 z-10 shrink-0">
          {/* Usa img normale come fallback finché non aggiungi l'icon.png */}
          <img
            src="/icon.png"
            alt="AGESCI"
            className="h-[40px] w-auto drop-shadow-md object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-max animate-[marquee_7s_linear_infinite]">
            <span className="inline-block whitespace-nowrap py-2 px-12 font-['Space_Grotesk'] font-bold text-[22px] tracking-wide text-[#FFF3DC] drop-shadow-md">
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap py-2 px-12 font-['Space_Grotesk'] font-bold text-[22px] tracking-wide text-[#FFF3DC] drop-shadow-md"
              aria-hidden="true"
            >
              Il grande gioco del quadro capi
            </span>
          </div>
        </div>
      </div>

      {/* ---------- MAIN ROW ---------- */}
      <div className="flex flex-1 min-h-0">
        {/* ---------- SIDEBAR ---------- */}
        <aside
          className="w-[250px] min-w-[250px] flex flex-col p-[18px_14px_14px] shadow-[-6px_0_14px_rgba(0,0,0,0.25)_inset] z-20 relative"
          style={{
            background:
              'linear-gradient(160deg, var(--wood-light), var(--wood) 60%, var(--wood-dark))',
          }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <h1 className="font-['Space_Grotesk'] font-bold text-[28px] text-[#FFF3DC] m-[2px_4px_12px] drop-shadow-md leading-none">
            Malcapitati
          </h1>

          <form onSubmit={handleAddCard} className="flex flex-col gap-2 mb-3.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Nome…"
                maxLength={30}
                autoComplete="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-black/20 font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#E8B84B]"
              />
              <button
                type="submit"
                className="px-3.5 rounded-lg border-none bg-[#2F7A5C] text-white font-semibold text-sm cursor-pointer active:translate-y-px"
              >
                Aggiungi
              </button>
            </div>

            {/* Scelta Simboli in Creazione */}
            <div className="flex gap-1 flex-wrap">
              {SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleNewCardSymbol(sym)}
                  className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[15px] cursor-pointer transition-colors ${newCardSymbols.includes(sym) ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-black/10 text-white/90 hover:bg-black/20'}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </form>

          <div className="text-white/75 text-[12.5px] m-[0_4px_8px] font-medium">
            In che staff li mettiamo?
          </div>

          <div className="flex-1 overflow-y-auto p-1 flex flex-wrap content-start gap-2.5 touch-pan-y">
            {unassignedCards.length === 0 ? (
              <div className="text-white/60 font-['Space_Grotesk'] text-[15px] p-[20px_6px] w-full">
                I capi sono finiti.
              </div>
            ) : (
              unassignedCards.map((card) => renderCard(card, false))
            )}
          </div>
        </aside>

        {/* ---------- BOARD AREA ---------- */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* TOOLBAR */}
          <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-sm z-20 flex-wrap relative">
            <div className="flex gap-1.5 items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCurrentColor(c);
                    setCurrentTool('pencil');
                  }}
                  className={`w-[26px] h-[26px] rounded-full border-2 p-0 cursor-pointer transition-transform ${currentColor === c && currentTool === 'pencil' ? 'border-[#232323] scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  title="Colore matita"
                />
              ))}
            </div>

            <div className="w-px h-[26px] bg-[#c9bd9c]" />
            <label className="flex items-center gap-2 text-[13px] text-[#3a2f1a] font-medium">
              spessore{' '}
              <input
                type="range"
                min="2"
                max="18"
                value={currentSize}
                onChange={(e) => setCurrentSize(parseInt(e.target.value, 10))}
                className="w-[100px] cursor-pointer"
              />
            </label>
            <div className="w-px h-[26px] bg-[#c9bd9c]" />

            <button
              onClick={() =>
                setCurrentTool(currentTool === 'eraser' ? 'pencil' : 'eraser')
              }
              className={`px-[14px] py-[8px] rounded-lg border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer active:translate-y-px transition-colors ${currentTool === 'eraser' ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#fffdf7] text-[#3a2f1a]'}`}
            >
              Gomma
            </button>
            <button
              onClick={clearCanvas}
              className="px-[14px] py-[8px] rounded-lg border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] bg-[#fffdf7] text-[#3a2f1a] cursor-pointer hover:bg-[#f3ead5]"
            >
              Pulisci lavagna
            </button>
            <div className="w-px h-[26px] bg-[#c9bd9c]" />
            <button
              onClick={handleAddGroup}
              className="px-[14px] py-[8px] rounded-lg border border-[#2E6E9E] bg-[#2E6E9E] text-white font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer active:translate-y-px"
            >
              + Nuovo gruppo
            </button>
          </div>

          {/* LAVAGNA E GRUPPI */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{
              background:
                'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1.2px) 0 0/26px 26px, var(--board-bg)',
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 touch-none z-0"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />

            <div className="absolute inset-0 pointer-events-none z-10">
              {groups.map((group) => {
                const members = cards.filter((c) => c.groupId === group.id);
                return (
                  <div
                    key={group.id}
                    className="absolute bg-[rgba(255,253,248,0.94)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] border border-black/10 flex flex-col min-w-[160px] min-h-[110px] pointer-events-auto"
                    style={{
                      left: group.x,
                      top: group.y,
                      width: 320,
                      height: 230,
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(e, group.id);
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 p-[7px_8px_7px_12px] rounded-t-[10px] cursor-grab"
                      style={{ backgroundColor: group.color }}
                    >
                      <div
                        className="flex-1 font-['Space_Grotesk'] font-bold text-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] outline-none cursor-text truncate focus:truncate-none focus:bg-black/10 focus:rounded-[5px] focus:px-1 focus:-mx-1"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {group.name}
                      </div>
                      <div className="font-['Work_Sans'] text-[13px] font-semibold text-white/85 bg-black/20 px-[9px] py-[3px] rounded-[10px]">
                        {members.length}
                      </div>
                      <button
                        onClick={() => handleRemoveGroup(group.id)}
                        className="w-6 h-6 rounded-full bg-black/15 text-white text-[14px] flex items-center justify-center font-bold cursor-pointer border-none p-0 hover:bg-black/25"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                      {members.length === 0 ? (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-2.5 font-['Space_Grotesk'] text-[17px] text-[#9a917c] pointer-events-none">
                          Trascina qui un malcapitato
                        </div>
                      ) : (
                        members.map((card, idx) => {
                          const defX = 14 + (idx % 2) * 130;
                          const defY = 14 + Math.floor(idx / 2) * 60;
                          // Wrapper posizionato in modo assoluto per il gruppo
                          return (
                            <div
                              key={card.id}
                              className="absolute"
                              style={{ left: defX, top: defY }}
                            >
                              {renderCard(card, true)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
