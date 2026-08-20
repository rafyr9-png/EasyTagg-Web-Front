import React, { useEffect, useState } from 'react';
import Auth from './components/Auth';
import MigratePanel from './components/MigratePanel';
import Players from './components/Players';
import History from './components/History';
import Tagging from './components/Tagging';
import { api } from './api';

type User = { id: string; email: string; name?: string };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMigrate, setShowMigrate] = useState(false);
  const [view, setView] = useState<'legacy' | 'players' | 'history' | 'tagging'>('legacy');
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const token = q.get('token');
    if (token) {
      localStorage.setItem('et_access_token', token);
      history.replaceState({}, '', location.pathname);
    }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {
        localStorage.removeItem('et_access_token');
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="loading">Loading Easy Tagg…</div>;
  if (!user) return <Auth onAuth={setUser} />;
  return (
    <div className="appShell">
      <div className="accountBar">
        <span>{user.email}</span>
        <div className="accountActions">
          <button onClick={() => setShowMigrate(true)}>Migrate</button>
          <button
            onClick={async () => {
              await api('/auth/logout', { method: 'POST' }).catch(() => {});
              localStorage.removeItem('et_access_token');
              setUser(null);
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="nav">
        <button onClick={() => setView('legacy')} className={view === 'legacy' ? 'active' : ''}>
          Legacy
        </button>
        <button onClick={() => setView('players')} className={view === 'players' ? 'active' : ''}>
          Players
        </button>
        <button onClick={() => setView('history')} className={view === 'history' ? 'active' : ''}>
          History
        </button>
        <button onClick={() => setView('tagging')} className={view === 'tagging' ? 'active' : ''}>
          Tagging
        </button>
      </div>
      <div className="content">
        {view === 'legacy' && (
          <iframe
            title="Easy Tagg"
            src="/legacy/index.html"
            style={{ width: '100%', height: '80vh', border: 0 }}
          />
        )}
        {view === 'players' && <Players />}
        {view === 'history' && <History />}
        {view === 'tagging' && <Tagging />}
      </div>
      {showMigrate && <MigratePanel onClose={() => setShowMigrate(false)} />}
    </div>
  );
}
