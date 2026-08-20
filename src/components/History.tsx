import React, { useEffect, useState } from 'react';
import { api } from '../api';

type Tag = any;

export default function History() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await api('/tags');
      setTags(d || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function del(id: string) {
    if (!confirm('Delete tag?')) return;
    try {
      await api(`/tags/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function csv() {
    const headers = [
      'tag_id',
      'game_name',
      'game_time',
      'inning',
      'batting_side',
      'pitcher',
      'batter',
      'result',
      'created_at',
    ];
    const rows = tags
      .map((t) => headers.map((h) => `"${String(t[h] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    return headers.join(',') + '\n' + rows;
  }

  return (
    <div className="panel historyPanel">
      <h2>History</h2>
      <div className="actions">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(csv());
            alert('CSV copied');
          }}
        >
          Copy CSV
        </button>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="list">
          {tags.map((t: Tag) => (
            <div key={t.tag_id} className="row">
              <div>
                <b>{t.result || t.final_result || '-'}</b>
                <div className="muted">
                  {t.pitcher || '-'} vs {t.batter || '-'} · {t.game_time || ''} · {t.inning}/
                  {t.half}
                </div>
              </div>
              <div>
                <button onClick={() => del(t.tag_id)} className="danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
