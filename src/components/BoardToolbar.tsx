import { COLORS } from '../lib/constants';

type BoardToolbarProps = {
  currentColor: string | null;
  currentTool: 'pencil' | 'eraser';
  currentSize: number;
  onToggleTool: () => void;
  onClearBoard: () => void;
  onAddGroup: () => void;
  onColorSelect: (color: string) => void;
  onSizeChange: (value: number) => void;
};

export function BoardToolbar({
  currentColor,
  currentTool,
  currentSize,
  onToggleTool,
  onClearBoard,
  onAddGroup,
  onColorSelect,
  onSizeChange,
}: BoardToolbarProps) {
  return (
    <div className="flex items-center gap-[14px] p-[10px_16px] bg-gradient-to-b from-[#f3efe6] to-[#e9e2d2] border-b border-[#cfc4a8] shadow-[0_2px_6px_rgba(0,0,0,0.15)] z-[5] flex-wrap relative">
      <div className="flex gap-[6px] items-center">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorSelect(c)}
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
          onChange={(e) => onSizeChange(parseInt(e.target.value, 10))}
          className="w-[100px] cursor-pointer"
        />
      </label>
      <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
      <button
        onClick={onToggleTool}
        className={`px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] cursor-pointer ${currentTool === 'eraser' ? 'bg-[#3a2f1a] text-[#fffdf7]' : 'bg-[#fffdf7] text-[#3a2f1a]'}`}
      >
        Gomma
      </button>
      <button
        onClick={onClearBoard}
        className="px-[14px] py-[8px] rounded-[8px] border border-[#c9bd9c] font-['Work_Sans'] font-semibold text-[13.5px] bg-[#fffdf7] text-[#3a2f1a] cursor-pointer hover:bg-[#f3ead5]"
      >
        Pulisci lavagna
      </button>
      <div className="w-[1px] h-[26px] bg-[#c9bd9c]" />
      <button
        onClick={onAddGroup}
        className="px-[14px] py-[8px] rounded-[8px] border border-[#2E6E9E] bg-[#2E6E9E] text-white font-['Work_Sans'] font-bold text-[13.5px] cursor-pointer active:translate-y-[1px]"
      >
        Nuova Staff
      </button>
    </div>
  );
}
