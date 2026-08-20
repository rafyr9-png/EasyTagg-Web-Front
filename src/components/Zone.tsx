import React from 'react';

type Props = {
  x?: number;
  y?: number;
  status?: string;
  onChange?: (x: number, y: number, status?: string) => void;
};

export default function Zone({ x = 0, y = 0, status = '', onChange }: Props) {
  const handleClick = (nx: number, ny: number) => {
    if (onChange) onChange(nx, ny, status);
  };
  return (
    <div className="zoneGrid">
      {[0, 1, 2].map((r) => (
        <div key={r} className="zoneRow">
          {[0, 1, 2].map((c) => {
            const isActive = x === c && y === r;
            return (
              <button
                key={c}
                className={'zoneCell' + (isActive ? ' active' : '')}
                onClick={() => handleClick(c, r)}
              >
                {isActive ? status || '●' : ''}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
