'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  '#232323',
];
const SYMBOLS = ['T', '🎓', '⛺', '🐺', '🥾', '🧙'];

const ACTION_BTN_CLASS =
  "action-btn flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] border border-[rgba(255,255,255,0.4)] bg-[rgba(0,0,0,0.4)] font-['Work_Sans'] font-bold text-[13px] cursor-pointer backdrop-blur-[4px] hover:bg-[rgba(0,0,0,0.7)] hover:border-[rgba(255,255,255,0.8)] transition-all duration-200";
const DROPDOWN_CLASS =
  'dropdown-menu absolute top-[calc(100%+8px)] right-0 bg-[rgba(0,0,0,0.85)] border border-[rgba(255,255,255,0.3)] shadow-2xl rounded-xl p-1.5 flex flex-col min-w-[200px] z-50 backdrop-blur-[4px]';
const MENU_ITEM_CLASS =
  "menu-item flex items-center gap-3 px-3 py-2 hover:bg-[rgba(255,255,255,0.15)] rounded-[4px] cursor-pointer font-['Work_Sans'] font-semibold text-[14px] text-white transition-colors text-left w-full";

export default function QuadroCapiApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [inputValue, setInputValue] = useState('');
  const [newCardSymbols, setNewCardSymbols] = useState<string[]>([]);
  const [showCreationSymbols, setShowCreationSymbols] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [editingGroupColor, setEditingGroupColor] = useState<string | null>(
    null
  );
  const [openMenu, setOpenMenu] = useState<'load' | 'save' | null>(null);
  const [modal, setModal] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });

  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [currentSize, setCurrentSize] = useState(4);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'eraser'>('pencil');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

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
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const [, forceRender] = useState({});

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

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const { type, id, startX, startY, origX, origY, origW, origH } =
        dragState.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!dragState.current.moved && Math.hypot(dx, dy) > 5)
        dragState.current.moved = true;
      if (!dragState.current.moved) return;

      if (type === 'group') {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== id) return g;
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
        ghostRef.current.style.left = `${e.clientX - origX}px`;
        ghostRef.current.style.top = `${e.clientY - origY}px`;
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (!dragState.current) return;
      const { type, id, origX, origY } = dragState.current;

      if (type === 'card' && ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;

        document.querySelectorAll('.dragging-origin').forEach((el) => {
          el.classList.remove('dragging-origin');
        });

        let droppedGroupId: string | null = null;
        let localX = 0,
          localY = 0;

        if (boardRef.current) {
          const boardRect = boardRef.current.getBoundingClientRect();
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
              localX = Math.max(0, e.clientX - gx - (origX || 20));
              localY = Math.max(0, e.clientY - gy - (origY || 25));
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
              return { ...c, groupId: null, px: undefined, py: undefined };
            }
          })
        );
      }

      dragState.current = null;
      setDraggingCardId(null);
      forceRender({});
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [groups]);

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
    if (currentTool === 'pencil' && !currentColor) return;
    isDrawing.current = true;
    const ctx = ctxRef.current;
    if (!ctx) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.globalCompositeOperation =
      currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentColor || '#000';
    ctx.lineWidth =
      (currentTool === 'eraser' ? currentSize * 3 : currentSize) *
      (window.devicePixelRatio || 1);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
  };

  const draw = (e: React.PointerEvent) => {
    if (currentTool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
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

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        show: true,
        message,
        onConfirm: () => {
          setModal({ show: false, message: '', onConfirm: () => {} });
          resolve(true);
        },
        onCancel: () => {
          setModal({ show: false, message: '', onConfirm: () => {} });
          resolve(false);
        },
      });
    });
  };

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setModal({
        show: true,
        message,
        onConfirm: () => {
          setModal({ show: false, message: '', onConfirm: () => {} });
          resolve();
        },
      });
    });
  };

  const handleAddGroup = () => {
    const n = groups.length;
    setGroups([
      ...groups,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: 'Nuova Staff',
        color: GROUP_COLORS[n % GROUP_COLORS.length],
        x: 30 + (n % 4) * 40,
        y: 30 + (n % 4) * 30,
        w: 320,
        h: 230,
      },
    ]);
  };

  const handleExportJSON = () => {
    const data = {
      state: { cards, groups },
      canvas: canvasRef.current?.toDataURL('image/png'),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quadrocapi.json';
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
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
      } catch {
        await showAlert('Errore caricamento file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setOpenMenu(null);
  };

  const initCardDrag = (
    e: React.PointerEvent,
    card: Card,
    htmlEl: HTMLElement
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setEditingCardId(null);
    setEditingGroupColor(null);
    setDraggingCardId(card.id);

    htmlEl.classList.add('dragging-origin');

    const rect = htmlEl.getBoundingClientRect();
    const ghost = htmlEl.cloneNode(true) as HTMLDivElement;
    ghost.className = 'tag ghost-tag';
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.left = `${e.clientX - rect.width / 2}px`;
    ghost.style.top = `${e.clientY - rect.height / 2}px`;
    ghost.style.transform = 'rotate(-3deg) scale(1.05)';
    ghost.style.boxShadow = '0 8px 18px rgba(0,0,0,0.4)';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    dragState.current = {
      type: 'card',
      id: card.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.width / 2,
      origY: rect.height / 2,
      moved: false,
    };
  };

  const renderCard = (card: Card, inGroup: boolean = false) => {
    const isDragging = draggingCardId === card.id;
    return (
      <div
        key={card.id}
        onPointerDown={(e) => initCardDrag(e, card, e.currentTarget)}
        className={`tag ${inGroup ? 'in-group' : ''} ${card.symbols.length > 0 ? 'has-symbols' : ''}`}
        style={{
          ...(isDragging ? { opacity: 0.25 } : {}),
          ...(inGroup
            ? { left: card.px ?? 14, top: card.py ?? 14, position: 'absolute' }
            : {}),
        }}
      >
        {card.name}

        {card.symbols.length > 0 && (
          <div className="card-symbols">
            {card.symbols.map((sym) => (
              <span key={sym} className="card-symbol">
                {sym}
              </span>
            ))}
          </div>
        )}

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirm(
              `Sei sicuro di voler rimuovere ${card.name}?`
            );
            if (confirmed) {
              setCards(cards.filter((c) => c.id !== card.id));
            }
          }}
          className="del"
          title="Rimuovi cartellino"
        >
          ×
        </button>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setEditingCardId(editingCardId === card.id ? null : card.id);
          }}
          className="absolute bottom-[3px] right-[4px] w-[20px] h-[20px] flex items-center justify-center font-bold text-[15px] cursor-pointer bg-transparent border-none text-[#8a7a4a] hover:text-[#b23b2e] transition-colors"
        >
          {editingCardId === card.id ? '×' : '+'}
        </button>

        {editingCardId === card.id && (
          <div
            className="absolute top-[105%] left-0 p-2 bg-transparent rounded-[8px] shadow-none border-none z-[100] flex gap-2 cursor-default pointer-events-auto"
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
                  className={`w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-[14px] cursor-pointer transition-all border ${isActive ? 'bg-[#3a2f1a] text-[#fffdf7] font-bold scale-105 shadow border-[#3a2f1a]' : 'bg-[#f3efe6] text-[#3a2f1a] border-[#c9bd9c] hover:bg-[#e9e2d2]'}`}
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

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden font-['Work_Sans'] bg-[var(--wood-dark)] select-none"
      onClick={() => {
        setEditingCardId(null);
        setOpenMenu(null);
        setEditingGroupColor(null);
      }}
    >
      {/* ---------- BANNER CON LOGO E MARQUEE IN GRASSETTO ---------- */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-[2px] border-black/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0 z-20 flex items-center h-[52px] relative">
        <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none">
          <div className="banner-track h-full items-center">
            <span className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]">
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              Il grande gioco del quadro capi
            </span>
            <span
              className="inline-block whitespace-nowrap px-[50px] font-['Space_Grotesk'] font-bold text-[22px] tracking-[0.5px] text-[#FFF3DC] drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
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

        <div className="shrink-0 relative h-full flex items-center ml-4 mr-6 w-[60px] justify-center z-30 bg-[#5C4430]">
          <div className="absolute inset-0 bg-[#5C4430]" />
          <img
            src="/icon.png"
            alt=""
            className="h-[38px] w-auto relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </div>

      {/* ---------- TOP RIGHT CONTROLS ---------- */}
      <div
        className="absolute top-[8px] right-[16px] z-[100] flex gap-[10px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'load' ? null : 'load')}
            className={ACTION_BTN_CLASS}
          >
            📂 Carica quadro
          </button>
          {openMenu === 'load' && (
            <div className={DROPDOWN_CLASS}>
              <label className={MENU_ITEM_CLASS}>
                <Image
                  src="/local-logo.png"
                  alt="PC"
                  width={18}
                  height={18}
                  className="object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>Da locale (PC)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
              <button
                onClick={async () =>
                  await showAlert('Integrazione Google Drive in arrivo!')
                }
                className={MENU_ITEM_CLASS}
              >
                <Image
                  src="/drive-logo.png"
                  alt="Drive"
                  width={18}
                  height={18}
                  className="object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>Da Google Drive</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'save' ? null : 'save')}
            className={ACTION_BTN_CLASS}
          >
            💾 Salva quadro
          </button>
          {openMenu === 'save' && (
            <div className={DROPDOWN_CLASS}>
              <button onClick={handleExportJSON} className={MENU_ITEM_CLASS}>
                <Image
                  src="/local-logo.png"
                  alt="PC"
                  width={18}
                  height={18}
                  className="object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>In locale (JSON)</span>
              </button>
              <button
                onClick={async () =>
                  await showAlert('Integrazione Google Drive in arrivo!')
                }
                className={MENU_ITEM_CLASS}
              >
                <Image
                  src="/drive-logo.png"
                  alt="Drive"
                  width={18}
                  height={18}
                  className="object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>Su Google Drive</span>
              </button>
            </div>
          )}
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
              a.download = 'quadrocapi.png';
              a.click();
            }
          }}
          className={ACTION_BTN_CLASS}
        >
          📸 Esporta PNG
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ---------- SIDEBAR ORIGINALE CON TESTI BIANCHI ---------- */}
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

          <form
            onSubmit={handleAddCard}
            className="flex gap-[6px] mb-[14px] w-full"
          >
            <input
              type="text"
              placeholder="Nome…"
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

        {/* ---------- BOARD AREA ---------- */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-[0_2px_6px_rgba(0,0,0,0.15)] z-[5] flex-wrap relative">
            <div className="flex gap-[6px] items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    if (currentColor === c && currentTool === 'pencil') {
                      setCurrentColor(null);
                    } else {
                      setCurrentColor(c);
                      setCurrentTool('pencil');
                    }
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
              onClick={async () => {
                const confirmed = await showConfirm('Cancellare tutto?');
                if (confirmed) {
                  ctxRef.current?.clearRect(
                    0,
                    0,
                    canvasRef.current!.width,
                    canvasRef.current!.height
                  );
                }
              }}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] bg-[#fffdf7] text-[#3a2f1a] cursor-pointer hover:bg-[#f3ead5]"
            >
              Pulisci lavagna
            </button>
            <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
            <button
              onClick={handleAddGroup}
              className="px-[14px] py-[8px] rounded-[8px] border border-[#2E6E9E] bg-[#2E6E9E] text-white font-['Work_Sans'] font-bold text-[13.5px] cursor-pointer active:translate-y-[1px]"
            >
              Nuova Staff
            </button>
          </div>

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
              style={{
                cursor:
                  currentTool === 'eraser'
                    ? 'none'
                    : currentTool === 'pencil' && currentColor
                      ? 'crosshair'
                      : 'default',
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={() => setCursorPos(null)}
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
                        className="group-title flex-1 font-['Space_Grotesk'] font-bold text-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] outline-none cursor-text overflow-hidden text-ellipsis whitespace-nowrap focus:text-clip focus:bg-black/10 focus:rounded-[5px] focus:px-[4px] focus:mx-[-4px]"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          setGroups(
                            groups.map((g) =>
                              g.id === group.id
                                ? {
                                    ...g,
                                    name:
                                      e.currentTarget.textContent?.trim() ||
                                      'Nuova Staff',
                                  }
                                : g
                            )
                          )
                        }
                      >
                        {group.name}
                      </div>
                      <div className="group-count font-['Work_Sans'] text-[13px] font-semibold bg-black/20 px-[9px] py-[3px] rounded-[10px]">
                        {members.length}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                              className="w-[26px] h-[26px] rounded-full border-[1px] border-black/15 cursor-pointer hover:scale-110 transition-transform"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            `Sei sicuro di voler rimuovere ${group.name}? I capi inseriti torneranno disponbili`
                          );
                          if (confirmed) {
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
                        className="group-delete-btn w-[24px] h-[24px] rounded-full bg-[rgba(0,0,0,0.15)] text-white text-[14px] flex items-center justify-center font-bold cursor-pointer border-none p-0 hover:bg-[rgba(0,0,0,0.25)]"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                      {members.length === 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-[10px] font-['Space_Grotesk'] text-[17px] text-[#9a917c] pointer-events-none">
                          Trascina qui un malcapitato
                        </div>
                      )}
                      {members.map((card) => renderCard(card, true))}
                    </div>

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

      {modal.show && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-[10000] custom-modal-overlay"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={modal.onCancel || modal.onConfirm}
        >
          <div
            className="relative rounded-[12px] shadow-2xl custom-modal-content"
            style={{
              background: 'var(--tag-bg)',
              border: '2px solid var(--tag-border)',
              boxShadow: '0 12px 48px rgba(40,28,14,0.5)',
              width: '90%',
              maxWidth: '420px',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="text-[17px] leading-[1.5] mb-[24px] text-center"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                color: '#3a2f1a',
              }}
            >
              {modal.message}
            </div>
            <div className="flex gap-[12px] justify-center">
              {modal.onCancel && (
                <button
                  onClick={modal.onCancel}
                  className="px-[20px] py-[10px] rounded-[8px] font-['Work_Sans'] font-semibold text-[14px] cursor-pointer transition-all duration-200"
                  style={{
                    background: 'rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.15)',
                    color: '#3a2f1a',
                  }}
                >
                  Annulla
                </button>
              )}
              <button
                onClick={modal.onConfirm}
                className="px-[20px] py-[10px] rounded-[8px] font-['Work_Sans'] font-semibold text-[14px] cursor-pointer transition-all duration-200"
                style={{
                  background: '#3a2f1a',
                  border: '1px solid #2a1f0a',
                  color: '#fffdf7',
                }}
              >
                {modal.onCancel ? 'Conferma' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
