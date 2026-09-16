import { useOthers } from '@liveblocks/react/suspense';

const CURSOR_COLORS = [
  '#E8B324',
  '#2F7A5C',
  '#C1440E',
  '#6B4C8A',
  '#2E6E9E',
  '#B23B7E',
];

export function LiveCursors() {
  // useOthers recupera in automatico chi c'è nella stanza e le loro coordinate
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        const cursor =
          typeof presence?.cursor === 'object' &&
          presence.cursor !== null &&
          'x' in presence.cursor &&
          'y' in presence.cursor
            ? (presence.cursor as { x: number; y: number })
            : null;

        if (!cursor) return null;
        const color = CURSOR_COLORS[connectionId % CURSOR_COLORS.length];

        return (
          <div
            key={connectionId}
            className="absolute top-0 left-0 pointer-events-none z-[10000] flex flex-col items-start"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              transition: 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {/* Freccina del cursore */}
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill={color}
              stroke="white"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5.65376 21.1597L2.06344 2.53558C1.58524 0.05389 4.80853 -1.16858 6.44297 1.1396L21.5332 22.4578C23.011 24.5453 21.2135 27.2789 18.6657 26.8152L12.5762 25.7088C11.9686 25.5983 11.3323 25.826 10.9416 26.3196L7.54593 30.6122C5.97544 32.597 2.76672 31.3934 3.32785 28.9472L4.57726 23.499C4.70894 22.9248 4.3411 22.3667 3.7668 22.2351Z" />
            </svg>
            {/* Etichetta col nome (info.name arriva direttamente da Google Login!) */}
            <div
              className="px-2 py-1 rounded-full text-white text-[11px] font-bold shadow-md whitespace-nowrap ml-4 -mt-2 font-['Work_Sans']"
              style={{ backgroundColor: color }}
            >
              {info?.name || 'Capo'}
            </div>
          </div>
        );
      })}
    </>
  );
}
