'use client';

import {
  RoomProvider,
  useMyPresence,
  useStorage,
  useMutation,
} from '@liveblocks/react/suspense';
import { ClientSideSuspense } from '@liveblocks/react';
import { LiveList } from '@liveblocks/client';

import { useSession, signIn, signOut } from 'next-auth/react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas';

import { LiveCursors } from '@/components/LiveCursors';
import { BoardCard } from '@/components/BoardCard';
import { BoardCanvas } from '@/components/BoardCanvas';
import { BoardSidebar } from '@/components/BoardSidebar';
import { BoardTabs } from '@/components/BoardTabs';
import { BoardToolbar } from '@/components/BoardToolbar';
import { GoogleDriveModal } from '@/components/GoogleDriveModal';
import { GROUP_COLORS, SYMBOLS } from '@/lib/constants';
import { createId } from '@/lib/ids';
import type { Board, Card, Group } from '@/lib/types';
import { useGoogleDrive } from '@/lib/useGoogleDrive';

const ACTION_BTN_CLASS =
  "action-btn flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] border border-[rgba(255,255,255,0.4)] bg-[rgba(0,0,0,0.4)] font-['Work_Sans'] font-bold text-[13px] cursor-pointer backdrop-blur-[4px] hover:bg-[rgba(0,0,0,0.7)] hover:border-[rgba(255,255,255,0.8)] transition-all duration-200 text-white";

const DROPDOWN_CLASS =
  'dropdown-menu absolute top-[calc(100%+8px)] right-0 bg-[rgba(0,0,0,0.85)] border border-[rgba(255,255,255,0.3)] shadow-2xl rounded-xl p-1.5 flex flex-col min-w-[200px] z-[1000] backdrop-blur-[4px]';

const MENU_ITEM_CLASS =
  "menu-item flex items-center gap-[6px] px-[12px] py-[6px] hover:bg-[rgba(255,255,255,0.15)] rounded-[6px] cursor-pointer font-['Work_Sans'] font-bold text-[13px] text-white transition-colors text-left w-full";

const INITIAL_BOARDS: Board[] = [
  {
    id: 'b_initial',
    name: 'Lavagna 1',
    cards: [],
    groups: [],
    canvasData: null,
  },
];

function QuadroCapiApp() {
  const [{ cursor }, updateMyPresence] = useMyPresence();
  // --- STATO DELLE LAVAGNE & AUTOSAVE ---
  const { data: session } = useSession();

  const boards = useStorage((root) => root.boards) as Board[];

  const updateBoard = useMutation(
    ({ storage }, boardId: string, updates: Partial<Board>) => {
      const boardsList = storage.get('boards') as LiveList<Board>;
      const index = Array.from(boardsList).findIndex(
        (b: Board) => b.id === boardId
      );

      if (index !== -1) {
        const currentBoard = boardsList.get(index);

        if (currentBoard) {
          boardsList.set(index, { ...currentBoard, ...updates });
        }
      }
    },
    []
  );

  const addBoardMutation = useMutation(({ storage }, newBoard: Board) => {
    const boardsList = storage.get('boards') as LiveList<Board>;
    boardsList.push(newBoard);
  }, []);

  const deleteBoardMutation = useMutation(({ storage }, boardId: string) => {
    const boardsList = storage.get('boards') as LiveList<Board>;
    const index = Array.from(boardsList).findIndex(
      (b: Board) => b.id === boardId
    );
    if (index !== -1) boardsList.delete(index);
  }, []);
  const [activeBoardId, setActiveBoardId] = useState('b_initial');
  const [tabMenuOpen, setTabMenuOpen] = useState<{
    id: string;
    left: number;
    bottom: number;
  } | null>(null);

  const boardsRef = useRef(boards);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];
  const cards = activeBoard.cards;
  const groups = activeBoard.groups;

  const setCards = useCallback(
    (updater: Card[] | ((prev: Card[]) => Card[])) => {
      const currentBoard = boards.find((b) => b.id === activeBoardId);
      if (!currentBoard) return;
      const newCards =
        typeof updater === 'function' ? updater(currentBoard.cards) : updater;
      updateBoard(activeBoardId, { cards: newCards });
    },
    [activeBoardId, boards, updateBoard]
  );

  const setGroups = useCallback(
    (updater: Group[] | ((prev: Group[]) => Group[])) => {
      const currentBoard = boards.find((b) => b.id === activeBoardId);
      if (!currentBoard) return;
      const newGroups =
        typeof updater === 'function' ? updater(currentBoard.groups) : updater;
      updateBoard(activeBoardId, { groups: newGroups });
    },
    [activeBoardId, boards, updateBoard]
  );

  // --- STATI UI LOCALI ---
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [newCardSymbols, setNewCardSymbols] = useState<string[]>([]);
  const [showCreationSymbols, setShowCreationSymbols] = useState(false);

  // Per il popup Formazione dei cartellini che rompe l'overflow
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardPos, setEditingCardPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const [editingGroupColor, setEditingGroupColor] = useState<string | null>(
    null
  );
  const [openMenu, setOpenMenu] = useState<'load' | 'save' | null>(null);

  const [modal, setModal] = useState<{
    show: boolean;
    message: string;
    isPrompt?: boolean;
    onConfirm: (val?: string) => void;
    onCancel?: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });
  const [modalInput, setModalInput] = useState('');

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
  const [renderTrigger, forceRender] = useState({});

  // =========================================================================
  // SETUP CANVAS & EVENTI
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

  const currentCanvasData = boards.find(
    (b) => b.id === activeBoardId
  )?.canvasData;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    if (isDrawing.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentCanvasData) {
      const img = new window.Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = currentCanvasData;
    }
  }, [activeBoardId, currentCanvasData]);

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
              const content = boardRef.current.querySelector<HTMLElement>(
                `[data-group-id="${g.id}"] [data-group-content]`
              );
              const contentRect = content?.getBoundingClientRect();
              localX = Math.max(
                0,
                e.clientX - (contentRect?.left ?? gx) - (origX || 20)
              );
              localY = Math.max(
                0,
                e.clientY - (contentRect?.top ?? gy) - (origY || 25)
              );
              break;
            }
          }
        }

        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            if (droppedGroupId)
              return { ...c, groupId: droppedGroupId, px: localX, py: localY };
            return { ...c, groupId: null, px: undefined, py: undefined };
          })
        );
      }

      dragState.current = null;
      forceRender({});
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [groups, setCards, setGroups]);

  // =========================================================================
  // GESTIONE FOGLI E MENU CONTEXT
  // =========================================================================
  const saveCurrentCanvasData = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL('image/png') : null;
  }, []);

  const switchBoard = (id: string) => {
    if (id === activeBoardId) return;
    const currentCanvas = saveCurrentCanvasData();
    updateBoard(activeBoardId, { canvasData: currentCanvas });
    setTabMenuOpen(null);
    setActiveBoardId(id);
  };

  const addBoard = () => {
    const currentCanvas = saveCurrentCanvasData();
    updateBoard(activeBoardId, { canvasData: currentCanvas });

    const newId = createId('b');
    addBoardMutation({
      id: newId,
      name: `Lavagna ${boards.length + 1}`,
      cards: [],
      groups: [],
      canvasData: null,
    });

    setTabMenuOpen(null);
    setActiveBoardId(newId);
  };

  const handleTabMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabMenuOpen?.id === id) {
      setTabMenuOpen(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTabMenuOpen({
      id,
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
    });
  };

  const duplicateBoard = (id: string) => {
    const currentCanvas = saveCurrentCanvasData();
    updateBoard(activeBoardId, { canvasData: currentCanvas });

    const boardToCopy = boards.find((b) => b.id === id);
    if (!boardToCopy) return;

    const newId = createId('b');

    const copiedCards = boardToCopy.cards.map((c) => ({
      ...c,
      id: createId('c'),
    }));
    const copiedGroups = boardToCopy.groups.map((g) => ({
      ...g,
      id: createId('g'),
    }));

    copiedCards.forEach((c, idx) => {
      const originalCard = boardToCopy.cards[idx];
      if (originalCard.groupId) {
        const groupIdx = boardToCopy.groups.findIndex(
          (g) => g.id === originalCard.groupId
        );
        if (groupIdx !== -1) c.groupId = copiedGroups[groupIdx].id;
      }
    });

    addBoardMutation({
      ...boardToCopy,
      id: newId,
      name: `${boardToCopy.name} (Copia)`,
      cards: copiedCards,
      groups: copiedGroups,
    });

    setTabMenuOpen(null);
  };

  const renameBoard = async (id: string) => {
    const board = boards.find((b) => b.id === id);
    if (!board) return;
    setTabMenuOpen(null);

    const newName = await showPrompt(
      'Inserisci il nuovo nome per la lavagna:',
      board.name
    );

    if (newName && newName.trim()) {
      updateBoard(id, { name: newName.trim() });
    }
  };

  const deleteBoard = async (id: string) => {
    setTabMenuOpen(null);
    if (boards.length <= 1) {
      await showAlert("Non puoi eliminare l'unica lavagna rimasta.");
      return;
    }
    const confirmed = await showConfirm(
      'Sei sicuro di voler eliminare questa lavagna?'
    );
    if (!confirmed) return;

    if (id === activeBoardId) {
      const fallbackBoard = boards.find((b) => b.id !== id);
      if (fallbackBoard) {
        setActiveBoardId(fallbackBoard.id);
      }
    }

    deleteBoardMutation(id);
  };

  // =========================================================================
  // LOGICA DISEGNO E ALTRI HANDLER
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

    const currentCanvas = saveCurrentCanvasData();
    updateBoard(activeBoardId, { canvasData: currentCanvas });
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        show: true,
        message,
        isPrompt: false,
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
        isPrompt: false,
        onConfirm: () => {
          setModal({ show: false, message: '', onConfirm: () => {} });
          resolve();
        },
      });
    });
  };

  const showPrompt = (
    message: string,
    defaultValue: string = ''
  ): Promise<string | null> => {
    setModalInput(defaultValue);
    return new Promise((resolve) => {
      setModal({
        show: true,
        message,
        isPrompt: true,
        onConfirm: (val?: string) => {
          setModal({
            show: false,
            message: '',
            isPrompt: false,
            onConfirm: () => {},
          });
          resolve(val || '');
        },
        onCancel: () => {
          setModal({
            show: false,
            message: '',
            isPrompt: false,
            onConfirm: () => {},
          });
          resolve(null);
        },
      });
    });
  };

  const googleDrive = useGoogleDrive({
    session: session ?? null,
    boardName: activeBoard.name,
    getExportData: () => ({
      state: { cards, groups },
      canvas: saveCurrentCanvasData(),
    }),
    showAlert,
    showPrompt,
    onFileLoaded: (fileName, rawData) => {
      const data = rawData as {
        state?: { cards?: Card[]; groups?: Group[] };
        canvas?: string | null;
      };
      if (!data.state) {
        void showAlert('Formato del file non supportato o corrotto.');
        return;
      }

      const newId = createId('b');
      const currentCanvas = saveCurrentCanvasData();

      updateBoard(activeBoardId, { canvasData: currentCanvas });

      addBoardMutation({
        id: newId,
        name: fileName.replace('.json', '') || 'Lavagna Importata',
        cards: data.state?.cards ?? [],
        groups: data.state?.groups ?? [],
        canvasData: data.canvas ?? null,
      });
      setActiveBoardId(newId);
    },
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setCards((prev) => [
      ...prev,
      {
        id: createId('c'),
        name: inputValue.trim(),
        groupId: null,
        symbols: [...newCardSymbols],
      },
    ]);
    setInputValue('');
    setNewCardSymbols([]);
    setShowCreationSymbols(false);
  };

  const handleAddGroup = () => {
    setGroups((prev) => {
      const n = prev.length;
      return [
        ...prev,
        {
          id: createId('g'),
          name: 'Nuova Staff',
          color: GROUP_COLORS[n % GROUP_COLORS.length],
          x: 30 + (n % 4) * 40,
          y: 30 + (n % 4) * 30,
          w: 320,
          h: 230,
        },
      ];
    });
  };

  const handleExportJSON = () => {
    const currentCanvas = saveCurrentCanvasData();
    const data = {
      state: { cards, groups },
      canvas: currentCanvas,
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = activeBoard.name.replace(/\s+/g, '-').toLowerCase();
    a.download = `${safeName}-salvataggio.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleExportPNG = async () => {
    if (!boardRef.current) return;
    const canvas = await html2canvas(boardRef.current, {
      backgroundColor: '#FAF8F4',
      scale: 2,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'quadrocapi.png';
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.state) {
          const newId = createId('b');
          const currentCanvas = saveCurrentCanvasData();

          // 1. Salva il disegno attuale prima di cambiare lavagna
          updateBoard(activeBoardId, { canvasData: currentCanvas });

          // 2. Spingi la lavagna importata sul cloud
          addBoardMutation({
            id: newId,
            name: file.name.replace('.json', '') || 'Lavagna Importata',
            cards: data.state.cards || [],
            groups: data.state.groups || [],
            canvasData: data.canvas || null,
          });

          setActiveBoardId(newId);
        } else {
          await showAlert('Formato non supportato.');
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
    setTabMenuOpen(null);

    htmlEl.classList.add('dragging-origin');
    const rect = htmlEl.getBoundingClientRect();
    const ghost = htmlEl.cloneNode(true) as HTMLDivElement;
    ghost.className = `${htmlEl.className} ghost-tag`;
    ghost.classList.remove('dragging-origin');
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.boxSizing = 'border-box';
    ghost.style.minWidth = `${rect.width}px`;
    ghost.style.maxWidth = `${rect.width}px`;
    ghost.style.minHeight = `${rect.height}px`;
    ghost.style.maxHeight = `${rect.height}px`;
    ghost.style.left = `${e.clientX - rect.width / 2}px`;
    ghost.style.top = `${e.clientY - rect.height / 2}px`;
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
    return (
      <BoardCard
        key={card.id}
        card={card}
        inGroup={inGroup}
        editingCardId={editingCardId}
        onPointerDown={initCardDrag}
        onRemove={async (cardToRemove) => {
          const confirmed = await showConfirm(
            `Sei sicuro di voler rimuovere ${cardToRemove.name}?`
          );
          if (confirmed) {
            setCards((prev) =>
              prev.filter((currentCard) => currentCard.id !== cardToRemove.id)
            );
          }
        }}
        onToggleSymbols={(event, cardToEdit) => {
          event.stopPropagation();
          if (editingCardId === cardToEdit.id) {
            setEditingCardId(null);
          } else {
            const rect = event.currentTarget.getBoundingClientRect();
            let left = rect.left - 100;
            if (left < 16) left = 16;
            if (left + 240 > window.innerWidth) left = window.innerWidth - 240;
            setEditingCardPos({ left, top: rect.bottom + 6 });
            setEditingCardId(cardToEdit.id);
          }
        }}
      />
    );
  };

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden font-['Work_Sans'] bg-[var(--wood-dark)] select-none"
      onPointerMove={(e) =>
        updateMyPresence({
          cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
        })
      } // <-- AGGIUNTO
      onPointerLeave={() => updateMyPresence({ cursor: null })} // <-- AGGIUNTO
      onClick={() => {
        setEditingCardId(null);
        setOpenMenu(null);
        setEditingGroupColor(null);
        setTabMenuOpen(null);
      }}
    >
      <LiveCursors />
      {/* ---------- BANNER CON LOGO E MARQUEE IN GRASSETTO ---------- */}
      <div className="hidden md:flex w-full overflow-hidden bg-gradient-to-r from-[var(--wood-dark)] via-[var(--wood)] to-[var(--wood-dark)] border-b-[2px] border-black/35 shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0 z-20 flex items-center h-[52px] relative">
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
          <Image
            src="/icon.png"
            alt=""
            width={38}
            height={38}
            className="h-[38px] w-auto relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </div>
      {/* ---------- TOP RIGHT CONTROLS ---------- */}
      <div
        className="mobile-action-bar absolute top-[8px] left-[112px] right-[8px] z-[100] flex gap-[10px] overflow-x-auto pb-1 md:left-auto md:right-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-desktop-only relative">
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
                <span>Da locale</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
              <button
                onClick={googleDrive.handleOpenDriveModal}
                disabled={!session}
                className={`${MENU_ITEM_CLASS} ${!session ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              >
                <Image
                  src="/drive-logo.png"
                  alt="Drive"
                  width={18}
                  height={18}
                  className={`object-contain ${!session ? 'grayscale opacity-60' : ''}`}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>Da Google Drive</span>
              </button>
            </div>
          )}
        </div>
        <div className="mobile-desktop-only relative">
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
                onClick={googleDrive.handleSaveToDrive}
                disabled={!session}
                className={`${MENU_ITEM_CLASS} ${!session ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
              >
                <Image
                  src="/drive-logo.png"
                  alt="Drive"
                  width={18}
                  height={18}
                  className={`object-contain ${!session ? 'grayscale opacity-60' : ''}`}
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
      {/* Bottone Menu Mobile in alto a sinistra (visibile solo su schermi piccoli) */}
      <button
        className={`mobile-menu-toggle absolute top-[8px] left-[16px] z-[200] ${ACTION_BTN_CLASS}`}
        onClick={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
      >
        {isSidebarMobileOpen ? '❌ Chiudi' : '☰ Capi'}
      </button>

      <div className="flex flex-1 min-h-0 relative">
        {/* Overlay scuro: cliccandolo si chiude la sidebar */}
        {isSidebarMobileOpen && (
          <div
            className="mobile-sidebar-overlay absolute inset-0 bg-black/60 z-[140] backdrop-blur-sm"
            onClick={() => setIsSidebarMobileOpen(false)}
          />
        )}

        {/* Sidebar wrapper con logica a scorrimento (Off-canvas) */}
        <div
          className={`mobile-sidebar-shell z-[150] h-full transition-transform duration-300 ease-in-out ${isSidebarMobileOpen ? 'mobile-sidebar-open' : ''}`}
        >
          <BoardSidebar
            cards={cards}
            inputValue={inputValue}
            setInputValue={setInputValue}
            newCardSymbols={newCardSymbols}
            setNewCardSymbols={setNewCardSymbols}
            showCreationSymbols={showCreationSymbols}
            setShowCreationSymbols={setShowCreationSymbols}
            renderCard={renderCard}
            onAddCard={handleAddCard}
            onAddGroup={handleAddGroup}
            onExportPNG={handleExportPNG}
            onImportJSON={handleImportJSON}
            onLoadDrive={googleDrive.handleOpenDriveModal}
            onSaveJSON={handleExportJSON}
            onSaveDrive={googleDrive.handleSaveToDrive}
            session={session ?? null}
            onSignIn={async () => {
              await signIn('google');
            }}
            onSignOut={async () => {
              if (await showConfirm('Sei sicuro di voler fare il logout?')) {
                await signOut();
              }
            }}
          />
        </div>

        {/* ---------- BOARD AREA ---------- */}
        <main className="mobile-main flex-1 flex flex-col min-w-0 relative">
          <div className="mobile-toolbar">
            <BoardToolbar
              currentColor={currentColor}
              currentTool={currentTool}
              currentSize={currentSize}
              onToggleTool={() =>
                setCurrentTool(currentTool === 'eraser' ? 'pencil' : 'eraser')
              }
              onClearBoard={async () => {
                const confirmed = await showConfirm('Cancellare tutto?');
                if (confirmed) {
                  ctxRef.current?.clearRect(
                    0,
                    0,
                    canvasRef.current!.width,
                    canvasRef.current!.height
                  );
                  const currentCanvas = saveCurrentCanvasData();
                  updateBoard(activeBoardId, { canvasData: currentCanvas });
                }
              }}
              onAddGroup={handleAddGroup}
              onColorSelect={(color) => {
                if (currentColor === color && currentTool === 'pencil') {
                  setCurrentColor(null);
                } else {
                  setCurrentColor(color);
                  setCurrentTool('pencil');
                }
              }}
              onSizeChange={(value) => setCurrentSize(value)}
            />
          </div>

          {/* NUOVO CONTENITORE SCORREVOLE */}
          <div className="flex-1 overflow-auto relative touch-pan-x touch-pan-y bg-[var(--board-bg)]">
            {/* TAVOLO GIGANTE: 2000x1500px, per poter scorrere in tutte le direzioni su mobile */}
            <div className="w-[2000px] h-[1500px] relative">
              <BoardCanvas
                boardRef={boardRef}
                canvasRef={canvasRef}
                currentTool={currentTool}
                currentColor={currentColor}
                currentSize={currentSize}
                cursorPos={cursorPos}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={() => setCursorPos(null)}
                groups={groups}
                cards={cards}
                editingGroupColor={editingGroupColor}
                setEditingGroupColor={setEditingGroupColor}
                setGroups={setGroups}
                setCards={setCards}
                showConfirm={showConfirm}
                renderCard={renderCard}
                dragStateRef={dragState}
              />
            </div>
          </div>

          <BoardTabs
            boards={boards}
            activeBoardId={activeBoardId}
            tabMenuOpen={tabMenuOpen}
            onSwitchBoard={switchBoard}
            onTabMenuClick={handleTabMenuClick}
            onAddBoard={addBoard}
            onRenameBoard={renameBoard}
            onDuplicateBoard={duplicateBoard}
            onDeleteBoard={deleteBoard}
          />
        </main>
      </div>
      {/* ---------- TENDINA DEI SIMBOLI DELLA CARD IN FIXED ---------- */}
      {editingCardId &&
        editingCardPos &&
        (() => {
          const card = activeBoard.cards.find((c) => c.id === editingCardId);
          if (!card) return null;
          return (
            <div
              className="fixed p-2 bg-transparent rounded-[8px] shadow-none border-none z-[10000] flex gap-2 cursor-default pointer-events-auto"
              style={{ left: editingCardPos.left, top: editingCardPos.top }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {SYMBOLS.map((sym) => {
                const isActive = card.symbols.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCards((prev) =>
                        prev.map((c) => {
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
          );
        })()}

      {googleDrive.driveModal.show && (
        <GoogleDriveModal
          files={googleDrive.driveModal.files}
          loading={googleDrive.driveModal.loading}
          onClose={googleDrive.closeDriveModal}
          onLoadFile={googleDrive.handleLoadDriveFile}
        />
      )}

      {/* ---------- MODAL CONFERME E PROMPT ---------- */}
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
          onClick={modal.onCancel || (() => modal.onConfirm())}
        >
          <div
            className="relative rounded-[12px] shadow-2xl custom-modal-content flex flex-col"
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
              className="text-[17px] leading-[1.5] text-center font-semibold text-[#3a2f1a]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                marginBottom: modal.isPrompt ? '20px' : '24px',
              }}
            >
              {modal.message}
            </div>
            {modal.isPrompt && (
              <input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                autoFocus
                className="w-full box-border mb-[24px] px-[12px] py-[10px] rounded-[8px] border border-[rgba(0,0,0,0.2)] font-['Work_Sans'] text-[15px] bg-[var(--paper)] text-[#232323] outline-none focus:outline-[2px] focus:outline-[#E8B84B] shadow-inner text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') modal.onConfirm(modalInput);
                  if (e.key === 'Escape' && modal.onCancel) modal.onCancel();
                }}
              />
            )}
            <div className="flex gap-[12px] justify-center mt-auto">
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
                onClick={() =>
                  modal.onConfirm(modal.isPrompt ? modalInput : undefined)
                }
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

export default function Page() {
  return (
    <RoomProvider
      id="lavagna-principale"
      initialPresence={{ cursor: null }}
      initialStorage={{ boards: new LiveList(INITIAL_BOARDS) }}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[var(--wood-dark)] text-[#e4d19c] font-['Space_Grotesk'] font-bold text-2xl">
            Apertura lavagna multiplayer...
          </div>
        }
      >
        <QuadroCapiApp />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
