import { ArrowUpRight, QrCode, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QrPairingCardProps {
  onLaunchRemote?: (code: string) => void;
}

function buildDeterministicMatrix(seedText: string): boolean[][] {
  const size = 15;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 4 && c < 4;
      const inTopRight = r < 4 && c >= size - 4;
      const inBottomLeft = r >= size - 4 && c < 4;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const lr = r < 4 ? r : r - (size - 4);
        const lc = c < 4 ? c : c - (size - 4);
        grid[r][c] = lr === 0 || lr === 3 || lc === 0 || lc === 3 || (lr === 1 && lc === 1) || (lr === 2 && lc === 2);
      } else {
        hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
        grid[r][c] = (hash & 1) === 1;
      }
    }
  }
  return grid;
}

export function QrPairingCard({ onLaunchRemote }: QrPairingCardProps) {
  const [token, setToken] = useState('NXR-8492-RMT');
  const [rotations, setRotations] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [pairStatus, setPairStatus] = useState<'awaiting_scan' | 'paired'>('awaiting_scan');
  const [mobileCount, setMobileCount] = useState(0);

  const rotateServerToken = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      const res = await fetch('/api/remote/pair', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { code?: string };
        if (data.code) {
          setToken(data.code);
          setPairStatus('awaiting_scan');
          setMobileCount(0);
          setRotations((r) => r + 1);
          setRotating(false);
          return;
        }
      }
    } catch {
      // Fallback below when server unreachable
    }
    const num = Math.floor(1000 + Math.random() * 8999);
    setToken(`NXR-${num}-RMT`);
    setPairStatus('awaiting_scan');
    setMobileCount(0);
    setRotations((r) => r + 1);
    setRotating(false);
  };

  useEffect(() => {
    void fetch('/api/remote/pair', { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { code?: string } | null) => {
        if (data?.code) setToken(data.code);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/remote`);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'join', code: token, role: 'desktop' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string;
          session?: { status?: 'awaiting_scan' | 'paired'; mobileCount?: number };
        };
        if (msg.type === 'session:state' && msg.session) {
          if (msg.session.status === 'paired' || msg.session.status === 'awaiting_scan') {
            setPairStatus(msg.session.status);
          }
          setMobileCount(Number(msg.session.mobileCount || 0));
        }
      } catch {
        // Ignore malformed WS frame
      }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    return () => {
      ws.close();
    };
  }, [token]);

  const matrix = buildDeterministicMatrix(token);

  return (
    <div className="rounded-xl border border-white/10 bg-[#05070B] p-4 flex flex-col sm:flex-row items-center gap-4">
      <div className="rounded-lg bg-white p-2.5 shrink-0" aria-label={`Pairing QR preview for ${token}`}>
        <div
          className="grid gap-[1px]"
          style={{ gridTemplateColumns: `repeat(${matrix.length}, 5px)` }}
        >
          {matrix.flatMap((row, r) =>
            row.map((filled, c) => (
              <span
                key={`${r}-${c}`}
                className={`block h-[5px] w-[5px] ${filled ? 'bg-slate-950' : 'bg-white'}`}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <p className="text-xs font-medium text-blue-400 flex items-center justify-center sm:justify-start gap-1.5">
          <QrCode className="h-3.5 w-3.5" />
          <span>Nexora Remote Pairing Session</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <p className="font-mono text-sm font-semibold text-white tabular-nums">{token}</p>
          <span className="text-[11px] font-mono text-slate-400">
            · {pairStatus === 'paired' && mobileCount > 0 ? 'Phone connected' : wsConnected ? 'Relay live' : 'Standby'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {pairStatus === 'paired' && mobileCount > 0
            ? 'Live mobile audio session paired with your desktop character.'
            : rotations > 0
              ? 'Fresh 10-minute handshake code issued by Nexora relay.'
              : 'In the desktop app under Settings → Nexora Remote, scan or open the mobile companion.'}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={rotateServerToken}
            disabled={rotating}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`h-3 w-3 ${rotating ? 'animate-spin' : ''}`} />
            <span>{rotating ? 'Issuing...' : 'Rotate Pairing Code'}</span>
          </button>

          {onLaunchRemote && (
            <button
              type="button"
              onClick={() => onLaunchRemote(token)}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
            >
              <span>Open Remote Call</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
