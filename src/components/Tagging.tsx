import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Zone from './Zone';
import DetailSheet from './DetailSheet';

function fmtSecs(s: number) {
  s = Math.floor(+s || 0);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const RESULTS = [
  'Ball',
  'Strike',
  'Foul',
  'Single',
  'Double',
  'Triple',
  'HR',
  'Out',
  'BB',
  'HBP',
  'K Swinging',
  'K Looking',
  'Swing & Miss',
  'Check Swing',
  "Fielder's Choice",
  'Sac Fly',
  'Sac Bunt',
];

export default function Tagging() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameId, setGameId] = useState('');
  const [batter, setBatter] = useState('');
  const [pitcher, setPitcher] = useState('');
  const [tags, setTags] = useState<any[]>([]);
  const [clock, setClock] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [clockAnchorMs, setClockAnchorMs] = useState<number | null>(null);
  const [clockBase, setClockBase] = useState<number>(0);
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [outs, setOuts] = useState(0);
  const [battingSide, setBattingSide] = useState<'away' | 'home'>('away');
  const [zoneX, setZoneX] = useState<string>('');
  const [zoneY, setZoneY] = useState<string>('');
  const [zoneStatus, setZoneStatus] = useState<string>('');
  const [pending, setPending] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState({ contact: '', trajectory: '' });

  useEffect(() => {
    (async () => {
      try {
        const g = await api('/games');
        setGames(g || []);
        const p = await api('/players');
        setPlayers(p || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);
  // load persisted in-game state from legacy keys
  useEffect(() => {
    try {
      const sc = Number(localStorage.getItem('etd_clock') || '0');
      if (sc) setClock(sc);
      const sb = Number(localStorage.getItem('etd_balls') || '0');
      if (!isNaN(sb)) setBalls(sb);
      const ss = Number(localStorage.getItem('etd_strikes') || '0');
      if (!isNaN(ss)) setStrikes(ss);
      const so = Number(localStorage.getItem('etd_outs') || '0');
      if (!isNaN(so)) setOuts(so);
      const bat = localStorage.getItem('etd_batter');
      if (bat) setBatter(bat);
      const pit = localStorage.getItem('etd_pitcher');
      if (pit) setPitcher(pit);
      const side = localStorage.getItem('etd_side');
      if (side === 'home' || side === 'away') setBattingSide(side as any);
      const zx = localStorage.getItem('etd_zoneX');
      if (zx) setZoneX(zx);
      const zy = localStorage.getItem('etd_zoneY');
      if (zy) setZoneY(zy);
      const zs = localStorage.getItem('etd_zoneStatus');
      if (zs) setZoneStatus(zs);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // persist certain keys to localStorage
  useEffect(() => {
    localStorage.setItem('etd_clock', String(clock));
  }, [clock]);
  useEffect(() => {
    localStorage.setItem('etd_balls', String(balls));
  }, [balls]);
  useEffect(() => {
    localStorage.setItem('etd_strikes', String(strikes));
  }, [strikes]);
  useEffect(() => {
    localStorage.setItem('etd_outs', String(outs));
  }, [outs]);
  useEffect(() => {
    if (batter) localStorage.setItem('etd_batter', batter);
    else localStorage.removeItem('etd_batter');
  }, [batter]);
  useEffect(() => {
    if (pitcher) localStorage.setItem('etd_pitcher', pitcher);
    else localStorage.removeItem('etd_pitcher');
  }, [pitcher]);
  useEffect(() => {
    localStorage.setItem('etd_side', battingSide);
  }, [battingSide]);
  useEffect(() => {
    localStorage.setItem('etd_zoneX', String(zoneX));
    localStorage.setItem('etd_zoneY', String(zoneY));
    localStorage.setItem('etd_zoneStatus', String(zoneStatus));
  }, [zoneX, zoneY, zoneStatus]);

  useEffect(() => {
    if (!gameId) return setTags([]);
    (async () => {
      try {
        const t = await api(`/tags?game_id=${encodeURIComponent(gameId)}`);
        setTags(t || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [gameId]);

  // clock helpers (simple)
  useEffect(() => {
    let id: number | undefined;
    if (running) {
      id = setInterval(() => {
        if (clockAnchorMs === null) return;
        const elapsed = Math.max(0, Math.round((performance.now() - clockAnchorMs) / 1000));
        setClock(Math.round(clockBase + elapsed));
      }, 250) as unknown as number;
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [running, clockAnchorMs, clockBase]);
  function startClock() {
    if (running) return;
    setClockBase(clock);
    setClockAnchorMs(performance.now());
    setRunning(true);
  }

  function clipWin(res: any) {
    if (['Single', 'Double', 'Triple', 'HR', 'Out'].includes(res)) return { pre: 5, post: 5 };
    return { pre: 5, post: 3 };
  }
  function needDetail(res: any) {
    return ['Single', 'Double', 'Triple', 'HR', 'Out'].includes(res);
  }

  function resetCount() {
    setBalls(0);
    setStrikes(0);
  }
  function autoCount(res: string) {
    if (res === 'Ball') {
      setBalls((b) => {
        const nb = b + 1;
        if (nb >= 4) {
          resetCount();
          return 0;
        }
        return nb;
      });
    }
    if (['Strike', 'Check Swing', 'Swing & Miss'].includes(res)) {
      setStrikes((s) => {
        const ns = s + 1;
        if (ns >= 3) {
          setOuts((o) => Math.min(3, o + 1));
          resetCount();
          return 0;
        }
        return ns;
      });
    }
    if (res === 'Foul') {
      setStrikes((s) => (s < 2 ? s + 1 : s));
    }
    if (['BB', 'HBP'].includes(res)) resetCount();
    if (['K Swinging', 'K Looking'].includes(res)) {
      setOuts((o) => Math.min(3, o + 1));
      resetCount();
    }
    if (['Out', "Fielder's Choice", 'Sac Fly', 'Sac Bunt'].includes(res))
      setOuts((o) => Math.min(3, o + 1));
    if (needDetail(res)) resetCount();
    if (outs >= 3) setOuts(0);
  }

  function startTag(result: string) {
    startClock();
    if (!gameId) {
      alert('Select a game first');
      return;
    }
    const w = clipWin(result);
    const sec = clock;
    const pendingObj = {
      result,
      sec,
      time: fmtSecs(clock),
      cs: Math.max(0, clock - w.pre),
      ce: Math.round(clock + w.post),
      zx: zoneX,
      zy: zoneY,
      zs: zoneStatus,
    };
    setPending(pendingObj);
    setDetail({ contact: '', trajectory: '' });
    if (needDetail(result)) {
      setDetailOpen(true);
    } else {
      saveTag(pendingObj);
    }
  }

  async function saveTag(p?: any, d?: { contact: string; trajectory: string }) {
    if (!p) p = pending;
    if (!p) return;
    const dt = d || detail;
    if (needDetail(p.result) && (!dt.contact || !dt.trajectory)) {
      setDetailOpen(true);
      return;
    }
    const nowTs = new Date().toISOString();
    const g = games.find((x) => x.id === gameId);
    const pitcherName = players.find((p) => p.id === pitcher)?.name || '';
    const batterName = players.find((p) => p.id === batter)?.name || '';
    const pitcher_pitch_number = pitcher
      ? Math.max(
          0,
          ...tags
            .filter((t: any) => t.game_id === gameId && t.pitcher_id === pitcher)
            .map((t: any) => Number(t.pitcher_pitch_number) || 0)
        ) + 1
      : '';
    const body: any = {
      tag_id: undefined,
      game_id: gameId,
      game_name: g?.name,
      game_date: g?.date,
      home_team: g?.home,
      away_team: g?.away,
      game_seconds: p.sec,
      game_time: p.time,
      clip_start_seconds: p.cs,
      clip_start_time: fmtSecs(p.cs),
      clip_end_seconds: p.ce,
      clip_end_time: fmtSecs(p.ce),
      inning: 1,
      half: 'top',
      batting_side: battingSide,
      balls_before: balls,
      strikes_before: strikes,
      outs_before: outs,
      count_before: `${balls}-${strikes}`,
      pitcher_id: pitcher,
      pitcher: pitcherName,
      pitcher_hand: players.find((x) => x.id === pitcher)?.thr || '',
      pitcher_pitch_number,
      batter_id: batter,
      batter: batterName,
      batter_hand: players.find((x) => x.id === batter)?.bat || '',
      pitch_type: '',
      pitch_mph: '',
      zone_status: p.zs,
      zone_x: p.zx === '' ? '' : Math.round(Number(p.zx) || 0),
      zone_y: p.zy === '' ? '' : Math.round(Number(p.zy) || 0),
      result: p.result,
      final_result: p.result,
      contact_quality: needDetail(p.result) ? dt.contact : 'No Contact',
      trajectory: dt.trajectory || '',
      spray_location: '',
      exit_velocity: '',
      note: '',
      created_at: nowTs,
    };
    try {
      await api('/tags', { method: 'POST', body: JSON.stringify(body) });
      autoCount(p.result);
      if (['BB', 'HBP'].includes(p.result) || ['K Swinging', 'K Looking'].includes(p.result)) {
        /* advance or other logic could go here */
      }
      setPending(null);
      setDetail({ contact: '', trajectory: '' }); // refresh tags
      const t = await api(`/tags?game_id=${encodeURIComponent(gameId)}`);
      setTags(t || []);
      alert('Tag saved');
    } catch (e: any) {
      alert(e.message || e);
    }
  }

  return (
    <div className="panel taggingPanel">
      <h2>Tagging</h2>
      <div className="row">
        <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
          <option value="">Select game</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} · {g.date}
            </option>
          ))}
        </select>
        <select value={batter} onChange={(e) => setBatter(e.target.value)}>
          <option value="">Select batter</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={pitcher} onChange={(e) => setPitcher(e.target.value)}>
          <option value="">Select pitcher</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="counts">
        Balls: {balls} · Strikes: {strikes} · Outs: {outs} · Clock: {fmtSecs(clock)}
      </div>
      <div className="resultButtons">
        {RESULTS.map((r) => (
          <button key={r} onClick={() => startTag(r)}>
            {r}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Zone: </label>
        <Zone
          x={Number(zoneX || 0)}
          y={Number(zoneY || 0)}
          status={zoneStatus}
          onChange={(x, y, s) => {
            setZoneX(String(x));
            setZoneY(String(y));
            setZoneStatus(s || '');
          }}
        />
      </div>

      {detailOpen && (
        <DetailSheet
          contact={detail.contact}
          trajectory={detail.trajectory}
          onSave={(d) => {
            setDetail(d);
            setDetailOpen(false);
            saveTag(pending, d);
          }}
          onCancel={() => {
            setDetailOpen(false);
            setPending(null);
          }}
        />
      )}

      <h3>Tags for game</h3>
      <div className="list">
        {tags.map((t) => (
          <div key={t.tag_id} className="row">
            <div>
              <b>{t.result || t.final_result || '-'}</b>
              <div className="muted">
                {t.pitcher || '-'} vs {t.batter || '-'} · {t.game_time || ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
