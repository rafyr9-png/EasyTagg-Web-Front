import React, { useEffect, useState } from 'react';
import { api } from '../api';

type Player = { id: string; name: string; num?: string; team?: string; role?: string };

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [num, setNum] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('Bateador');

  async function load() {
    setLoading(true);
    try {
      const d = await api('/players');
      setPlayers(d || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/players', { method: 'POST', body: JSON.stringify({ name, num, team, role }) });
      setName('');
      setNum('');
      setTeam('');
      setRole('Bateador');
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function del(id: string) {
    if (!confirm('Delete player?')) return;
    try {
      await api(`/players/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="panel playersPanel">
      <h2>Players</h2>
      <form onSubmit={add} className="smallForm">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Num" value={num} onChange={(e) => setNum(e.target.value)} />
        <input placeholder="Team" value={team} onChange={(e) => setTeam(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Bateador</option>
          <option>Pitcher</option>
          <option>Ambos</option>
        </select>
        <button className="primary" type="submit">
          Add
        </button>
      </form>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="list">
          {players.map((p) => (
            <div key={p.id} className="row">
              <div>
                <b>{p.name}</b>
                <div className="muted">
                  #{p.num || '-'} · {p.team || '-'} · {p.role || '-'}
                </div>
              </div>
              <div>
                <button onClick={() => del(p.id)} className="danger">
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
