import React, { useState } from 'react';
import { api, API_BASE } from '../api';

type UserSetter = { onAuth: (u: any) => void };
export default function Auth({ onAuth }: UserSetter) {
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });
        setMsg('Account created. Check your email to verify it before signing in.');
        setMode('login');
      } else if (mode === 'magic') {
        await api('/auth/magic/request', { method: 'POST', body: JSON.stringify({ email }) });
        setMsg('Magic sign-in link sent.');
      } else {
        const d = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('et_access_token', d.accessToken);
        onAuth(d.user);
      }
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="authPage">
      <div className="authCard">
        <img src="/legacy/assets/easy_tagg_logo.jpeg" />
        <h1>
          EASY <span>TAGG</span>
        </h1>
        <p className="sub">Tag it. Sync it. Win it.</p>
        <div className="modes">
          <button onClick={() => setMode('login')} className={mode === 'login' ? 'active' : ''}>
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={mode === 'register' ? 'active' : ''}
          >
            Create Account
          </button>
          <button onClick={() => setMode('magic')} className={mode === 'magic' ? 'active' : ''}>
            Magic Link
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== 'magic' && (
            <input
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create Account'
                : mode === 'magic'
                  ? 'Send Magic Link'
                  : 'Sign In'}
          </button>
        </form>
        <div className="or">or</div>
        <button onClick={() => window.location.href = `${API_BASE}/auth/google`}>Continue with Google OAuth</button>
        {msg && <p className="msg">{msg}</p>}
        <p className="foot">Email verification · OAuth · Magic Links · JWT</p>
      </div>
    </div>
  );
}
