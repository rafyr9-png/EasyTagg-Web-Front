import React, { useState } from 'react';

const CONTACT_OPTIONS = ['Hard', 'Medium', 'Soft'];
const TRAJECTORY_OPTIONS = ['Ground Ball', 'Line Drive', 'Fly Ball'];

type Detail = { contact: string; trajectory: string };
type Props = {
  contact?: string;
  trajectory?: string;
  onSave?: (d: Detail) => void;
  onCancel?: () => void;
};

export default function DetailSheet({ contact = '', trajectory = '', onSave, onCancel }: Props) {
  const [c, setC] = useState(contact);
  const [t, setT] = useState(trajectory);
  const canSave = Boolean(c && t);
  return (
    <div className="detailSheet">
      <div className="detailSheetCard">
        <h3>Quality</h3>
        <div className="choiceGrid">
          {CONTACT_OPTIONS.map((opt) => (
            <button key={opt} className={c === opt ? 'selected' : ''} onClick={() => setC(opt)}>
              {opt}
            </button>
          ))}
        </div>
        <h3>Trajectory</h3>
        <div className="choiceGrid">
          {TRAJECTORY_OPTIONS.map((opt) => (
            <button key={opt} className={t === opt ? 'selected' : ''} onClick={() => setT(opt)}>
              {opt}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={() => onCancel?.()}>Cancel</button>
          <button
            className="primary"
            disabled={!canSave}
            onClick={() => canSave && onSave?.({ contact: c, trajectory: t })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
