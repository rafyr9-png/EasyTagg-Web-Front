import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function MigratePanel({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api('/migrate/preview')
      .then(setPreview)
      .catch((e: any) => setPreview({ error: e.message }));
  }, []);

  async function runMigration() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api('/migrate/snapshot', { method: 'POST' });
      setResult(r);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="migratePanel">
      <button className="close" onClick={onClose}>
        Close
      </button>
      <h3>Migration Preview</h3>
      {preview?.error && <div className="error">{preview.error}</div>}
      {preview && !preview.error && (
        <div>
          <div>
            Games: {preview.counts.games} (conflicts: {preview.conflicts.games})
          </div>
          <div>
            Players: {preview.counts.players} (conflicts: {preview.conflicts.players})
          </div>
          <div>
            Tags: {preview.counts.tags} (conflicts: {preview.conflicts.tags})
          </div>
          <button className="primary" disabled={busy} onClick={runMigration}>
            {busy ? 'Migrating...' : 'Run Migration'}
          </button>
          {result && <pre className="result">{JSON.stringify(result, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
