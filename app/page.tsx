'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas';

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
  const [showCreationSymbols, setShowCreationSymbols] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Stato per i menu a tendina in alto
  const [openMenu, setOpenMenu] = useState<'load' | 'save' | null>(null);

  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentSize, setCurrentSize] = useState(4);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser'>('pencil');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // --- CANVAS SETUP ---
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

    if (tempCanvas.width > 0) ctx.drawImage(tempCanvas, 0, 0);
  }, []);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    return () => window.removeEventListener('resize', sizeCanvas);
  }, [sizeCanvas]);

  // --- DISEGNO ---
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
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // --- CARTELLINI ---
  const toggleNewCardSymbol = (sym: string) => {
    setNewCardSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

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
    setShowCreationSymbols(false);
  };

  const handleRemoveCard = (id: string) =>
    setCards(cards.filter((card) => card.id !== id));

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

  // --- GRUPPI E DRAG&DROP ---
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

  const handleRemoveGroup = (groupId: string) => {
    setCards(
      cards.map((c) => (c.groupId === groupId ? { ...c, groupId: null } : c))
    );
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    setEditingCardId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId)
      setCards(
        cards.map((c) =>
          c.id === cardId ? { ...c, groupId: targetGroupId } : c
        )
      );
  };

  // --- IMPORT / EXPORT LOCAL ---
  const handleExportJSON = () => {
    const data = {
      state: { cards, groups },
      canvas: canvasRef.current?.toDataURL('image/png'),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lavagna-salvataggio.json';
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.state) {
          setCards(data.state.cards || []);
          setGroups(data.state.groups || []);
        }
        if (data.canvas && ctxRef.current && canvasRef.current) {
          const img = new window.Image();
          img.onload = () => {
            ctxRef.current?.clearRect(
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height
            );
            ctxRef.current?.drawImage(
              img,
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height
            );
          };
          img.src = data.canvas;
        }
      } catch (err) {
        alert('Errore caricamento file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setOpenMenu(null);
  };

  const handleExportPNG = async () => {
    if (!boardRef.current) return;
    try {
      const canvasObj = await html2canvas(boardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#FAF8F4',
      });
      const url = canvasObj.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lavagna-gruppi.png';
      a.click();
    } catch (err) {
      alert('Errore esportazione PNG');
    }
  };

  const unassignedCards = cards.filter((c) => c.groupId === null);

  const renderCard = (card: Card, inGroup: boolean = false) => (
    <div
      key={card.id}
      draggable
      onDragStart={(e) => handleDragStart(e, card.id)}
      className={`relative bg-[var(--tag-bg)] border border-[var(--tag-border)] rounded-[8px] px-[20px] py-[12px] font-['Space_Grotesk'] font-semibold text-[20px] text-[#3a2f1a] shadow-[0_3px_6px_var(--shadow)] cursor-grab active:cursor-grabbing touch-none leading-[1.15] max-w-[240px] break-words ${inGroup ? 'absolute' : ''} ${card.symbols.length > 0 ? 'pb-[34px]' : ''}`}
      style={inGroup ? { left: card.groupId ? undefined : 0, top: 0 } : {}}
    >
      <div className="absolute left-[8px] top-[14px] w-[9px] h-[9px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff,#b9a878_70%)] shadow-[inset_0_0_1px_rgba(0,0,0,0.4)]" />
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

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveCard(card.id);
        }}
        className="absolute top-[3px] right-[4px] w-[20px] h-[20px] leading-[20px] text-center rounded-full font-['Work_Sans'] text-[15px] font-bold text-[#8a7a4a] bg-transparent border-none cursor-pointer hover:text-[#b23b2e]"
      >
        ×
      </button>

      <button
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
                  toggleSymbolOnCard(card.id, sym);
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

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      onClick={() => {
        setEditingCardId(null);
        setOpenMenu(null);
      }}
    >
      {/* ---------- BANNER ---------- */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-2 border-black/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0 z-20 relative flex items-center px-4 py-2">
        {/* LOGO AGESCI STACCATO E SFOCCATO */}
        <div className="shrink-0 relative mr-6 ml-2">
          <div className="absolute inset-0 bg-white/40 blur-[10px] rounded-full scale-125" />
          <img
            src="/icon.png"
            alt="AGESCI"
            className="h-[45px] w-auto relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>

        {/* MARQUEE CENTRATO */}
        <div className="flex flex-1 overflow-hidden justify-center items-center mr-8">
          <div className="flex w-max animate-[marquee_7s_linear_infinite]">
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

        {/* CONTROLLI A DESTRA CON MENU A TENDINA */}
        <div className="flex gap-2.5 z-10 shrink-0 relative">
          {/* MENU CARICA */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'load' ? null : 'load');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-sm hover:bg-black/70 hover:border-white/80 transition-all"
            >
              📂 Carica quadro
            </button>
            {openMenu === 'load' && (
              <div className="absolute top-[calc(100%+8px)] right-0 bg-[#FFFdf8] border border-[#c9bd9c] shadow-xl rounded-lg p-1 flex flex-col min-w-[180px] z-50">
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-[#e9e2d2] rounded cursor-pointer font-['Work_Sans'] font-semibold text-[13.5px] text-[#3a2f1a] transition-colors">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  Da locale (PC)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-[#e9e2d2] rounded cursor-pointer font-['Work_Sans'] font-semibold text-[13.5px] text-[#3a2f1a] transition-colors text-left">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.3m16.55 5.5l-3.43-6H9.73l3.43 6" />
                  </svg>
                  Da Google Drive
                </button>
              </div>
            )}
          </div>

          {/* MENU SALVA */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'save' ? null : 'save');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-sm hover:bg-black/70 hover:border-white/80 transition-all"
            >
              💾 Salva quadro
            </button>
            {openMenu === 'save' && (
              <div className="absolute top-[calc(100%+8px)] right-0 bg-[#FFFdf8] border border-[#c9bd9c] shadow-xl rounded-lg p-1 flex flex-col min-w-[180px] z-50">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#e9e2d2] rounded cursor-pointer font-['Work_Sans'] font-semibold text-[13.5px] text-[#3a2f1a] transition-colors text-left"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  In locale (JSON)
                </button>
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-[#e9e2d2] rounded cursor-pointer font-['Work_Sans'] font-semibold text-[13.5px] text-[#3a2f1a] transition-colors text-left">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.3m16.55 5.5l-3.43-6H9.73l3.43 6" />
                  </svg>
                  Su Google Drive
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/40 bg-black/40 text-white font-['Work_Sans'] font-semibold text-[13px] cursor-pointer backdrop-blur-sm hover:bg-black/70 hover:border-white/80 transition-all"
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          <h1 className="font-['Space_Grotesk'] font-bold text-[28px] text-[#FFF3DC] m-[2px_4px_12px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] leading-none">
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
                className="flex-1 min-w-0 p-[9px_10px] rounded-[8px] border border-black/20 font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[#E8B84B]"
              />
              <button
                type="submit"
                className="px-[14px] rounded-[8px] border-none bg-[#2F7A5C] text-white font-semibold text-[14px] cursor-pointer active:translate-y-px"
              >
                Aggiungi
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setShowCreationSymbols(!showCreationSymbols)}
                className="text-[12px] font-semibold text-white/80 bg-black/10 px-2 py-1 rounded hover:bg-black/20 transition-colors"
              >
                {showCreationSymbols ? '− Nascondi' : '+ Formazione'}
              </button>
              {!showCreationSymbols && newCardSymbols.length > 0 && (
                <span className="text-[11px] bg-[#E8B324] text-black px-1.5 py-0.5 rounded-full font-bold">
                  {newCardSymbols.length}
                </span>
              )}
            </div>
            {showCreationSymbols && (
              <div className="flex gap-1 flex-wrap mt-1 p-2 bg-black/10 rounded-lg">
                {SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleNewCardSymbol(sym)}
                    className={`w-[26px] h-[26px] rounded flex items-center justify-center text-[15px] cursor-pointer transition-colors ${newCardSymbols.includes(sym) ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#fffdf7] text-black/90 hover:bg-[#e9e2d2]'}`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="text-white/75 text-[12.5px] m-[0_4px_8px] font-medium">
            In che staff li mettiamo?
          </div>
          <div className="flex-1 overflow-y-auto p-1 flex flex-wrap content-start gap-[10px]">
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
          <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-[0_2px_6px_rgba(0,0,0,0.15)] z-20 flex-wrap relative">
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
                />
              ))}
            </div>
            <div className="w-px h-[26px] bg-[#c9bd9c]" />
            <label className="flex items-center gap-1.5 text-[13px] text-[#3a2f1a] font-semibold">
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
              className={`px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer ${currentTool === 'eraser' ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#fffdf7] text-[#3a2f1a]'}`}
            >
              Gomma
            </button>
            <button
              onClick={clearCanvas}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] bg-[#fffdf7] text-[#3a2f1a] cursor-pointer hover:bg-[#f3ead5]"
            >
              Pulisci lavagna
            </button>
            <div className="w-px h-[26px] bg-[#c9bd9c]" />
            <button
              onClick={handleAddGroup}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#2E6E9E] bg-[#2E6E9E] text-white font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer"
            >
              + Nuovo gruppo
            </button>
          </div>

          {/* LAVAGNA (Target per il salvataggio PNG) */}
          <div
            ref={boardRef}
            className="relative flex-1 overflow-hidden"
            style={{
              background:
                'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1.2px) 0 0/26px 26px, var(--board-bg)',
            }}
            onDragOver={(e) => e.preventDefault()}
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
                    className="absolute bg-[rgba(255,253,248,0.94)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.22)] border border-black/10 flex flex-col pointer-events-auto"
                    style={{
                      left: group.x,
                      top: group.y,
                      width: group.w,
                      height: group.h,
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(e, group.id);
                    }}
                  >
                    <div
                      className="flex items-center gap-[6px] p-[7px_8px_7px_12px] rounded-t-[10px] cursor-grab"
                      style={{ backgroundColor: group.color }}
                    >
                      <div
                        className="flex-1 font-['Space_Grotesk'] font-bold text-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] outline-none cursor-text truncate"
                        contentEditable
                        suppressContentEditableWarning
                      >
                        {group.name}
                      </div>
                      <div className="font-['Work_Sans'] text-[13px] font-semibold text-white/85 bg-black/15 px-[9px] py-[3px] rounded-[10px]">
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
                      {members.map((card, idx) => (
                        <div
                          key={card.id}
                          className="absolute"
                          style={{
                            left: 14 + (idx % 2) * 130,
                            top: 14 + Math.floor(idx / 2) * 60,
                          }}
                        >
                          {renderCard(card, true)}
                        </div>
                      ))}
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
