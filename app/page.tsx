'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

type Card = {
  id: string;
  name: string;
  groupId: string | null;
  symbols: string[];
  px?: number;
  py?: number;
};
type Group = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
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

  const [inputValue, setInputValue] = useState('');
  const [newCardSymbols, setNewCardSymbols] = useState<string[]>([]);

  // Stati UI Locali (Menu)
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingGroupColor, setEditingGroupColor] = useState<string | null>(
    null
  );
  const [openMenu, setOpenMenu] = useState<'load' | 'save' | null>(null);

  // Tools
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentSize, setCurrentSize] = useState(4);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser'>('pencil');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // --- STATI DI TRASCINAMENTO (Drag & Resize liberi) ---
  const dragState = useRef<{
    type: 'group' | 'card' | 'resize';
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW?: number;
    origH?: number;
    moved: boolean;
  } | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null); // Per l'effetto trascinamento del cartellino fuori dal gruppo

  // Forziamo il re-render solo quando necessario per evitare lag
  const [, forceRender] = useState({});

  // =========================================================================
  // SETUP CANVAS & EVENTI GLOBALI MOUSE
  // =========================================================================
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const tempCanvas = document.createElement('canvas');
    if (canvas.width > 0 && canvas.height > 0) {
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
    }
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tempCanvas.width > 0) ctx.drawImage(tempCanvas, 0, 0);
  }, []);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    return () => window.removeEventListener('resize', sizeCanvas);
  }, [sizeCanvas]);

  // Gestione movimento mouse per spostamento elementi
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const { type, id, startX, startY, origX, origY, origW, origH } =
        dragState.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Tolleranza per non bloccare i click
      if (!dragState.current.moved && Math.hypot(dx, dy) > 5)
        dragState.current.moved = true;
      if (!dragState.current.moved) return;

      if (type === 'group') {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== id) return g;
            // Limiti minimi (per non uscire in alto/sinistra)
            return {
              ...g,
              x: Math.max(0, origX + dx),
              y: Math.max(0, origY + dy),
            };
          })
        );
      } else if (type === 'resize' && origW && origH) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== id) return g;
            return {
              ...g,
              w: Math.max(160, origW + dx),
              h: Math.max(110, origH + dy),
            };
          })
        );
      } else if (type === 'card' && ghostRef.current) {
        // Muoviamo il fantasma del cartellino
        ghostRef.current.style.left = `${e.clientX + 5}px`;
        ghostRef.current.style.top = `${e.clientY + 5}px`;
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (!dragState.current) return;
      const { type, id } = dragState.current;

      if (type === 'card' && ghostRef.current) {
        // Rilascio del cartellino
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;

        // Capiamo su quale gruppo è stato rilasciato (usando le API DOM di React è complesso, facciamo hit-test basico)
        let droppedGroupId: string | null = null;
        let localX = 0,
          localY = 0;

        // Se eravamo sulla board, controlliamo se il mouse è caduto dentro un gruppo
        if (boardRef.current) {
          const boardRect = boardRef.current.getBoundingClientRect();
          // Cerca il gruppo al contrario (dall'alto in basso come z-index visivo)
          for (let i = groups.length - 1; i >= 0; i--) {
            const g = groups[i];
            const gx = boardRect.left + g.x;
            const gy = boardRect.top + g.y;
            if (
              e.clientX >= gx &&
              e.clientX <= gx + g.w &&
              e.clientY >= gy &&
              e.clientY <= gy + g.h
            ) {
              droppedGroupId = g.id;
              // Calcoliamo la coordinata relativa!
              // Sottraiamo l'header (ca. 45px)
              localX = Math.max(0, e.clientX - gx - 20); // 20px padding
              localY = Math.max(0, e.clientY - gy - 45);
              break;
            }
          }
        }

        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            if (droppedGroupId) {
              return { ...c, groupId: droppedGroupId, px: localX, py: localY };
            } else {
              // Rilasciato fuori dai gruppi = torna in sidebar
              return { ...c, groupId: null, px: undefined, py: undefined };
            }
          })
        );
      }

      dragState.current = null;
      forceRender({}); // Forza un aggiornamento leggero per pulire stati visivi se serviva
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [groups]);

  // =========================================================================
  // LOGICA DI DISEGNO (Mano libera sul canvas)
  // =========================================================================
  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (window.devicePixelRatio || 1),
      y: (e.clientY - rect.top) * (window.devicePixelRatio || 1),
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (e.button !== 0 || dragState.current) return;
    isDrawing.current = true;
    const ctx = ctxRef.current;
    if (!ctx) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.globalCompositeOperation =
      currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth =
      (currentTool === 'eraser' ? currentSize * 3 : currentSize) *
      (window.devicePixelRatio || 1);
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

  // =========================================================================
  // GESTIONE STATO APP
  // =========================================================================
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setCards([
      ...cards,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: inputValue.trim(),
        groupId: null,
        symbols: [...newCardSymbols],
      },
    ]);
    setInputValue('');
    setNewCardSymbols([]);
  };

  const handleAddGroup = () => {
    const n = groups.length;
    setGroups([
      ...groups,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: 'Nuovo gruppo',
        color: GROUP_COLORS[n % GROUP_COLORS.length],
        x: 30 + (n % 4) * 40,
        y: 30 + (n % 4) * 30,
        w: 320,
        h: 230,
      },
    ]);
  };

  const initCardDrag = (
    e: React.PointerEvent,
    card: Card,
    htmlEl: HTMLElement
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Solo tasto sinistro
    setEditingCardId(null);
    setEditingGroupColor(null);

    // Creiamo il ghost element per il drag libero
    const rect = htmlEl.getBoundingClientRect();
    const ghost = htmlEl.cloneNode(true) as HTMLDivElement;
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${e.clientX + 5}px`;
    ghost.style.top = `${e.clientY + 5}px`;
    ghost.style.transform = 'rotate(-3deg) scale(1.05)';
    ghost.style.boxShadow = '0 8px 18px rgba(0,0,0,0.4)';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    dragState.current = {
      type: 'card',
      id: card.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: 0,
      origY: 0,
      moved: false,
    };
  };

  // =========================================================================
  // RENDER SINGOLA CARD
  // =========================================================================
  const renderCard = (card: Card, inGroup: boolean = false) => {
    return (
      <div
        key={card.id}
        onPointerDown={(e) => initCardDrag(e, card, e.currentTarget)}
        className={`relative bg-[var(--tag-bg)] border border-[var(--tag-border)] rounded-[8px] px-[20px] py-[12px] font-['Space_Grotesk'] font-semibold text-[20px] text-[#3a2f1a] shadow-[0_3px_6px_var(--shadow)] cursor-grab active:cursor-grabbing touch-none leading-[1.15] max-w-[240px] break-words ${inGroup ? 'absolute' : ''} ${card.symbols.length > 0 ? 'pb-[34px]' : ''}`}
        style={
          inGroup
            ? { left: card.px ?? 14, top: card.py ?? 14, fontSize: '22px' }
            : {}
        }
      >
        <div className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#b9a878_70%)] shadow-[inset_0_0_1px_rgba(0,0,0,0.4)]" />
        {card.name}

        {card.symbols.length > 0 && (
          <div className="absolute left-[12px] bottom-[7px] flex gap-1 items-center pointer-events-none">
            {card.symbols.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center justify-center min-w-[23px] h-[23px] px-1 rounded-[5px] bg-white/70 text-[17px] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
              >
                {sym}
              </span>
            ))}
          </div>
        )}

        {/* Tasto Rimuovi */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setCards(cards.filter((c) => c.id !== card.id));
          }}
          className="absolute top-[3px] right-[4px] w-[20px] h-[20px] leading-[20px] text-center rounded-full font-['Work_Sans'] text-[15px] font-bold text-[#8a7a4a] bg-transparent border-none cursor-pointer hover:text-[#b23b2e]"
        >
          ×
        </button>

        {/* Menu Formazione */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setEditingCardId(editingCardId === card.id ? null : card.id);
          }}
          className={`absolute bottom-[4px] right-[4px] w-[22px] h-[22px] rounded flex items-center justify-center font-bold text-[14px] cursor-pointer transition-colors ${editingCardId === card.id ? 'bg-[#b23b2e] text-white hover:bg-[#8a2d23]' : 'bg-black/5 text-black/50 hover:bg-black/15'}`}
        >
          {editingCardId === card.id ? '×' : '+'}
        </button>

        {editingCardId === card.id && (
          <div
            className="absolute top-[105%] left-0 p-1.5 bg-[#FFFdf8] rounded-lg shadow-xl border border-[#c9bd9c] z-[100] flex gap-1 cursor-default pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {SYMBOLS.map((sym) => {
              const isActive = card.symbols.includes(sym);
              return (
                <button
                  key={sym}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCards(
                      cards.map((c) => {
                        if (c.id !== card.id) return c;
                        return {
                          ...c,
                          symbols: isActive
                            ? c.symbols.filter((s) => s !== sym)
                            : [...c.symbols, sym],
                        };
                      })
                    );
                  }}
                  className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[16px] cursor-pointer ${isActive ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#f3efe6] text-[#3a2f1a] hover:bg-[#e9e2d2]'}`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // RENDER APP PRINCIPALE
  // =========================================================================
  return (
    <div
      className="flex flex-col h-screen overflow-hidden text-[var(--ink)] font-['Work_Sans'] bg-[var(--wood-dark)]"
      onClick={() => {
        setEditingCardId(null);
        setOpenMenu(null);
        setEditingGroupColor(null);
      }}
    >
      {/* ---------- BANNER ---------- */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-[2px] border-black/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0 z-20 flex items-center h-[52px]">
        {/* LOGO */}
        <div className="shrink-0 relative h-full flex items-center ml-4 mr-6 w-[50px] justify-center">
          <div className="absolute inset-0 bg-white/40 blur-[10px] rounded-full scale-[1.3]" />
          <img
            src="/icon.png"
            alt=""
            className="h-[38px] w-auto relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>

        {/* MARQUEE */}
        <div className="flex flex-1 overflow-hidden h-full">
          <div className="flex w-max animate-[marquee_7s_linear_infinite] h-full items-center">
            <span className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              Il grande gioco del quadro capi
            </span>
          </div>
        </div>

        {/* EXPORT / IMPORT CONTROLS */}
        <div className="flex gap-2.5 z-10 shrink-0 mr-4">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'load' ? null : 'load');
              }}
              className="flex items-center gap-1.5 px-[12px] py-[6px] rounded-[6px] border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-[4px] hover:bg-black/70 hover:border-white/80 transition-all"
            >
              📂 Carica Dati
            </button>
            {/* Opzioni menu Carica qui... (omesse per brevità, uguali a prima) */}
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'save' ? null : 'save');
              }}
              className="flex items-center gap-1.5 px-[12px] py-[6px] rounded-[6px] border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-[4px] hover:bg-black/70 hover:border-white/80 transition-all"
            >
              💾 Salva Dati
            </button>
          </div>
          <button
            onClick={async () => {
              if (boardRef.current) {
                const c = await html2canvas(boardRef.current, {
                  backgroundColor: '#FAF8F4',
                  scale: 2,
                });
                const a = document.createElement('a');
                a.href = c.toDataURL();
                a.download = 'lavagna.png';
                a.click();
              }
            }}
            className="flex items-center gap-1.5 px-[12px] py-[6px] rounded-[6px] border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-[4px] hover:bg-black/70 hover:border-white/80 transition-all"
          >
            📸 Esporta PNG
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ---------- SIDEBAR ---------- */}
        <aside
          className="w-[250px] min-w-[250px] flex flex-col p-[18px_14px_14px] shadow-[inset_-6px_0_14px_rgba(0,0,0,0.25)] z-20 relative"
          style={{
            background:
              'linear-gradient(160deg, var(--wood-light), var(--wood) 60%, var(--wood-dark))',
          }}
        >
          <h1 className="font-['Space_Grotesk'] font-bold text-[28px] text-[#FFF3DC] m-[2px_4px_12px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] leading-none">
            Malcapitati
          </h1>

          <form
            onSubmit={handleAddCard}
            className="flex flex-col gap-[6px] mb-[14px]"
          >
            <div className="flex gap-[6px]">
              <input
                type="text"
                placeholder="Nome…"
                maxLength={30}
                autoComplete="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 min-w-0 p-[9px_10px] rounded-[8px] border border-black/20 font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[var(--ink)] outline-none focus:outline-[2px] focus:outline-[#E8B84B]"
              />
              <button
                type="submit"
                className="px-[14px] rounded-[8px] border-none bg-[#2F7A5C] text-white font-semibold text-[14px] cursor-pointer active:translate-y-[1px]"
              >
                Aggiungi
              </button>
            </div>
            {/* Opzioni Simboli (uguali a prima)... */}
          </form>

          <div className="text-white/75 text-[12.5px] m-[0_4px_8px] font-medium">
            In che staff li mettiamo?
          </div>
          <div className="flex-1 overflow-y-auto p-[4px] flex flex-wrap content-start gap-[10px]">
            {cards.filter((c) => c.groupId === null).length === 0 ? (
              <div className="text-white/60 font-['Space_Grotesk'] text-[15px] p-[20px_6px] w-full">
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

        {/* ---------- BOARD AREA ---------- */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* TOOLBAR DISGNO */}
          <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-[0_2px_6px_rgba(0,0,0,0.15)] z-[5] flex-wrap relative">
            <div className="flex gap-[6px] items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCurrentColor(c);
                    setCurrentTool('pencil');
                  }}
                  className={`w-[26px] h-[26px] rounded-full border-[2px] p-0 cursor-pointer ${currentColor === c && currentTool === 'pencil' ? 'border-[#232323] scale-[1.12]' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
            <label className="flex items-center gap-[6px] text-[13px] text-[#3a2f1a] font-semibold">
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
            <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
            <button
              onClick={() =>
                setCurrentTool(currentTool === 'eraser' ? 'pencil' : 'eraser')
              }
              className={`px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer ${currentTool === 'eraser' ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#fffdf7] text-[#3a2f1a]'}`}
            >
              Gomma
            </button>
            <button
              onClick={() => {
                if (confirm('Cancellare tutto?'))
                  ctxRef.current?.clearRect(
                    0,
                    0,
                    canvasRef.current!.width,
                    canvasRef.current!.height
                  );
              }}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] bg-[#fffdf7] text-[#3a2f1a] cursor-pointer hover:bg-[#f3ead5]"
            >
              Pulisci lavagna
            </button>
            <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
            <button
              onClick={handleAddGroup}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#2E6E9E] bg-[#2E6E9E] text-white font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer"
            >
              + Nuovo gruppo
            </button>
          </div>

          {/* LAYER LAVAGNA E GRUPPI */}
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
              className="absolute inset-0 touch-none z-0"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />

            {/* LAYER GRUPPI */}
            <div className="absolute inset-0 z-[2] pointer-events-none">
              {groups.map((group) => {
                const members = cards.filter((c) => c.groupId === group.id);
                return (
                  <div
                    key={group.id}
                    className="absolute bg-[rgba(255,253,248,0.94)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] border border-black/10 flex flex-col pointer-events-auto min-w-[160px] min-h-[110px]"
                    style={{
                      left: group.x,
                      top: group.y,
                      width: group.w,
                      height: group.h,
                    }}
                  >
                    {/* Header Trascinabile */}
                    <div
                      onPointerDown={(e) => {
                        if (
                          (e.target as HTMLElement).tagName === 'BUTTON' ||
                          (e.target as HTMLElement).isContentEditable
                        )
                          return;
                        e.preventDefault();
                        dragState.current = {
                          type: 'group',
                          id: group.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: group.x,
                          origY: group.y,
                          moved: false,
                        };
                      }}
                      className="flex items-center gap-[6px] p-[7px_8px_7px_12px] rounded-t-[10px] cursor-grab touch-none relative"
                      style={{ backgroundColor: group.color }}
                    >
                      <div
                        className="flex-1 font-['Space_Grotesk'] font-bold text-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] outline-none cursor-text overflow-hidden text-ellipsis whitespace-nowrap focus:text-clip focus:bg-black/10 focus:rounded-[5px] focus:px-[4px] focus:mx-[-4px]"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? {
                                    ...g,
                                    name:
                                      e.currentTarget.textContent || 'Gruppo',
                                  }
                                : g
                            )
                          )
                        }
                      >
                        {group.name}
                      </div>
                      <div className="font-['Work_Sans'] text-[13px] font-semibold text-white/85 bg-black/20 px-[9px] py-[3px] rounded-[10px]">
                        {members.length}
                      </div>

                      {/* Tasto Colore */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGroupColor(
                            editingGroupColor === group.id ? null : group.id
                          );
                        }}
                        className="w-[24px] h-[24px] rounded-full bg-black/15 text-white text-[10px] flex items-center justify-center cursor-pointer border-none p-0 font-['Work_Sans']"
                      >
                        ⬤
                      </button>

                      {/* Menu Colori a tendina */}
                      {editingGroupColor === group.id && (
                        <div
                          className="absolute top-[calc(100%+6px)] right-[30px] p-[10px] bg-[#FFFdf8] rounded-[10px] shadow-[0_8px_20px_rgba(0,0,0,0.3)] border border-[#cfc4a8] z-[100] flex flex-wrap gap-[8px] w-[140px] cursor-default"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {GROUP_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setGroups(
                                  groups.map((g) =>
                                    g.id === group.id ? { ...g, color: c } : g
                                  )
                                );
                                setEditingGroupColor(null);
                              }}
                              className="w-[26px] h-[26px] rounded-full border-2 border-black/10 cursor-pointer"
                              style={{ background: c }}
                            />
                          ))}
                          <div className="flex items-center gap-[6px] w-full font-['Work_Sans'] text-[11.5px] text-[#5a4c30] border-t border-[#e6dcbf] pt-[8px] mt-[2px]">
                            <span>altro</span>
                            <input
                              type="color"
                              value={group.color}
                              onChange={(e) =>
                                setGroups(
                                  groups.map((g) =>
                                    g.id === group.id
                                      ? { ...g, color: e.target.value }
                                      : g
                                  )
                                )
                              }
                              className="w-[26px] h-[26px] border-none p-0 bg-transparent cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Eliminare? I cartellini torneranno disponibili.'
                            )
                          ) {
                            setCards(
                              cards.map((c) =>
                                c.groupId === group.id
                                  ? {
                                      ...c,
                                      groupId: null,
                                      px: undefined,
                                      py: undefined,
                                    }
                                  : c
                              )
                            );
                            setGroups(groups.filter((g) => g.id !== group.id));
                          }
                        }}
                        className="w-[24px] h-[24px] rounded-full bg-black/15 text-white text-[14px] flex items-center justify-center font-bold cursor-pointer border-none p-0"
                      >
                        ×
                      </button>
                    </div>

                    {/* Corpo del gruppo (Area Drop) */}
                    <div className="flex-1 relative overflow-hidden">
                      {members.length === 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-[10px] font-['Space_Grotesk'] text-[17px] text-[#9a917c] pointer-events-none">
                          Trascina qui un malcapitato
                        </div>
                      )}
                      {members.map((card) => renderCard(card, true))}
                    </div>

                    {/* Maniglia Resize */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        dragState.current = {
                          type: 'resize',
                          id: group.id,
                          startX: e.clientX,
                          startY: e.clientY,
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
          </div>
        </main>
      </div>
    </div>
  );
}
