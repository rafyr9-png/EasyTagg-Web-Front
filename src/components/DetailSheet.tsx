import React, { useState } from 'react';

type Props = { detail?: string; onSave?: (d: string) => void; onCancel?: () => void };

export default function DetailSheet({ detail = '', onSave, onCancel }: Props) {
  const [d, setD] = useState(detail);
  return (
    <div className="detailSheet">
      <textarea value={d} onChange={(e) => setD(e.target.value)} placeholder="Detalle..." />
      <div className="actions">
        <button onClick={() => onCancel?.()}>Cancel</button>
        <button className="primary" onClick={() => onSave?.(d)}>
          Save
        </button>
      </div>
    </div>
  );
}
