import type { PointerEvent } from 'react';

import type { Card } from '../lib/types';

type BoardCardProps = {
  card: Card;
  inGroup?: boolean;
  editingCardId: string | null;
  onPointerDown: (
    event: PointerEvent<HTMLDivElement>,
    card: Card,
    element: HTMLDivElement
  ) => void;
  onRemove: (card: Card) => void;
  onToggleSymbols: (
    event: React.MouseEvent<HTMLButtonElement>,
    card: Card
  ) => void;
};

export function BoardCard({
  card,
  inGroup = false,
  editingCardId,
  onPointerDown,
  onRemove,
  onToggleSymbols,
}: BoardCardProps) {
  return (
    <div
      onPointerDown={(event) => onPointerDown(event, card, event.currentTarget)}
      className={`tag ${inGroup ? 'in-group' : ''} ${card.symbols.length > 0 ? 'has-symbols' : ''}`}
      style={{
        ...(inGroup
          ? { left: card.px ?? 14, top: card.py ?? 14, position: 'absolute' }
          : {}),
      }}
    >
      {card.name}
      {card.symbols.length > 0 && (
        <div className="card-symbols">
          {card.symbols.map((symbol) => (
            <span key={symbol} className="card-symbol">
              {symbol}
            </span>
          ))}
        </div>
      )}
      <button
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(card);
        }}
        className="del"
        title="Rimuovi cartellino"
      >
        ×
      </button>
      <button
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => onToggleSymbols(event, card)}
        className="absolute bottom-[3px] right-[4px] w-[20px] h-[20px] flex items-center justify-center font-bold text-[15px] cursor-pointer bg-transparent border-none text-[#8a7a4a] hover:text-[#b23b2e] transition-colors"
      >
        {editingCardId === card.id ? '×' : '+'}
      </button>
    </div>
  );
}
