import {
  ArrowLeft,
  CheckCircle2,
  Mic,
  MicOff,
  PauseCircle,
  Phone,
  PhoneOff,
  Play,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AppRoute } from '../components/Navbar';
import { ParticleAvatarCanvas } from '../components/ParticleAvatarCanvas';
import {
  ActionLedgerEntry,
  AvatarForm,
  CoreMood,
  MemoryItem,
  PERSONAS,
  PersonaId,
} from '../data/stonicData';
import { playCoreChime } from '../utils/audioChime';
import { formatCallDuration, isValidPairingCode, normalizePairingCode } from '../utils/stonicLogic';

interface RemoteTranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface RemoteCallPageProps {
  initialCode?: string;
  avatarForm: AvatarForm;
  coreMood?: CoreMood;
  memories: MemoryItem[];
  onUsageIncrement?: () => void;
  onNavigate: (route: AppRoute) => void;
  pcPaused: boolean;
  onTogglePcPaused: () => void;
  ledgerEntries: ActionLedgerEntry[];
  onApproveEntry: (entryId: string) => { ok: boolean; error?: string };
  onRejectEntry: (entryId: string) => { ok: boolean; error?: string };
}

const REMOTE_QUICK_PROMPTS = [
  'Give me a quick status check.',
  'Remind me what priorities I saved.',
  'Stay on the line while I walk.',
];

export function RemoteCallPage({
  initialCode = '',
  avatarForm,
  coreMood = 'standby',
  memories,
  onUsageIncrement,
  onNavigate,
  pcPaused,
  onTogglePcPaused,
  ledgerEntries,
  onApproveEntry,
  onRejectEntry,
}: RemoteCallPageProps) {
  const [codeInput, setCodeInput] = useState(() =>
    initialCode ? normalizePairingCode(initialCode) : ''
  );
  const [activeCode, setActiveCode] = useState<string | null>(() =>
    initialCode && isValidPairingCode(initialCode) ? normalizePairingCode(initialCode) : null
  );
  const [personaId, setPersonaId] = useState<PersonaId>('jarvis');
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [callActive, setCallActive] = useState(false);
  const [desktopOnline, setDesktopOnline] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [transcript, setTranscript] = useState<RemoteTranscriptTurn[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const speakerRef = useRef(speakerOn);
  const usageCallbackRef = useRef(onUsageIncrement);

  speakerRef.current = speakerOn;
  usageCallbackRef.current = onUsageIncrement;

  const activePersona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];

  useEffect(() => {
    if (initialCode && isValidPairingCode(initialCode)) {
      const normalized = normalizePairingCode(initialCode);
      setCodeInput(normalized);
      setActiveCode(normalized);
    }
  }, [initialCode]);

  useEffect(() => {
    if (!callActive) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callActive]);

  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  function speakReply(text: string) {
    if (!speakerRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = activePersona.voicePitch;
      utterance.rate = activePersona.voiceRate;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore synthesis availability issues
    }
  }

  useEffect(() => {
    if (!activeCode) {
      setWsStatus('disconnected');
      setCallActive(false);
      return;
    }

    setError(null);
    setWsStatus('connecting');
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/remote`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      playCoreChime('activate');
      ws.send(JSON.stringify({ type: 'join', code: activeCode, role: 'mobile' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string;
          error?: string;
          turn?: RemoteTranscriptTurn;
          session?: {
            callActive?: boolean;
            desktopCount?: number;
            transcript?: RemoteTranscriptTurn[];
          };
        };

        if (msg.type === 'session:state' && msg.session) {
          setCallActive(Boolean(msg.session.callActive));
          setDesktopOnline(Number(msg.session.desktopCount || 0) > 0);
          if (Array.isArray(msg.session.transcript)) {
            setTranscript(msg.session.transcript);
          }
        } else if (msg.type === 'remote:transcript' && msg.turn) {
          const incomingTurn = msg.turn;
          setTranscript((prev) =>
            prev.some((t) => t.id === incomingTurn.id) ? prev : [...prev, incomingTurn]
          );
          if (incomingTurn.role === 'assistant') {
            setSending(false);
            playCoreChime('reply');
            usageCallbackRef.current?.();
            speakReply(incomingTurn.text);
          }
        } else if (msg.type === 'remote:error') {
          setSending(false);
          setError(msg.error || 'Relay communication error.');
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setCallActive(false);
      setSending(false);
    };

    ws.onerror = () => {
      setWsStatus('disconnected');
      setError('Unable to maintain WebSocket relay connection.');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeCode]);

  const handlePairSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizePairingCode(codeInput);
    if (!isValidPairingCode(normalized)) {
      setError('Enter a valid pairing code like NXR-8492-RMT.');
      return;
    }
    setError(null);
    setElapsedSec(0);
    setActiveCode(normalized);
  };

  const handleGenerateSession = async () => {
    setError(null);
    try {
      const res = await fetch('/api/remote/pair', { method: 'POST' });
      if (!res.ok) throw new Error('Unable to issue pairing token.');
      const data = (await res.json()) as { code: string };
      setCodeInput(data.code);
      setElapsedSec(0);
      setActiveCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start remote session.');
    }
  };

  const handleSendTurn = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || !activeCode || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    setError(null);
    setSending(true);
    setMessageInput('');
    wsRef.current.send(
      JSON.stringify({
        type: 'remote:message',
        code: activeCode,
        clientMsgId: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed,
        personaId,
        avatarForm,
        memories,
      })
    );
  };

  const handleSpeakPush = () => {
    if (muted) {
      setError('Unmute microphone before speaking.');
      return;
    }
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRec) {
      setError('Microphone speech recognition is unavailable in this browser. Type your line below.');
      return;
    }
    try {
      const recognition = new SpeechRec() as {
        lang: string;
        interimResults: boolean;
        onstart: () => void;
        onend: () => void;
        onerror: () => void;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        start: () => void;
      };
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        setError('Microphone permission denied or unavailable.');
      };
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (text) handleSendTurn(text);
      };
      recognition.start();
    } catch {
      setListening(false);
      setError('Could not initialize speech capture.');
    }
  };

  const handleEndCall = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeCode) {
      wsRef.current.send(JSON.stringify({ type: 'remote:end', code: activeCode }));
      wsRef.current.close();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setActiveCode(null);
    setWsStatus('disconnected');
  };

  const pendingApprovals = ledgerEntries.filter((e) => e.status === 'Pending Approval');

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 overflow-x-clip">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
            Nexora Remote · Mobile Voice &amp; Executive Approvals
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Call your PC &amp; approve business tasks anywhere.
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Pair over WebSocket with your Windows session to talk live, approve staged folder tasks, or trigger your emergency PC kill switch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePcPaused}
            aria-pressed={pcPaused}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              pcPaused
                ? 'border-red-400/50 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                : 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
            }`}
          >
            {pcPaused ? <Play className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5 text-amber-300" />}
            <span>{pcPaused ? 'Resume PC Access' : 'Pause PC Access'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      {/* Executive Approvals Synced from PC Business Operator */}
      <section
        aria-label="Mobile Executive Approvals"
        className="mt-8 rounded-xl border border-white/10 bg-[#0A0F1A] p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F4F2ED]">
              Executive PC Approvals
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Staged actions from your paired Windows workstation sync here in real time.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-amber-300">
            {pendingApprovals.length} pending · {pcPaused ? 'PC Lock PAUSED' : 'PC Lock Active'}
          </span>
        </div>

        {pcPaused && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/35 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Emergency Kill Switch is engaged. Remote approvals are locked until you resume PC access.</span>
          </div>
        )}

        {pendingApprovals.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#05070B] p-4 flex items-center gap-3 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>No staged PC actions awaiting confirmation right now.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pendingApprovals.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-amber-400/30 bg-[#05070B] p-4 space-y-2.5"
              >
                <div className="text-[11px] font-mono text-amber-300 tabular-nums">
                  {entry.timestamp} · {entry.playbookTitle}
                </div>
                <p className="text-sm font-semibold text-[#F4F2ED]">{entry.actionTitle}</p>
                <p className="font-mono text-[11px] text-slate-400 break-all">{entry.targetPath}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={pcPaused}
                    onClick={() => onApproveEntry(entry.id)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-[#F4F2ED] px-3.5 py-2 text-xs font-semibold text-[#07080A] hover:bg-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve &amp; Execute</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectEntry(entry.id)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-300" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!activeCode ? (
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Enter Desktop Pairing Code
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Open NexoraAI on Windows or copy the code shown in the Overview Nexora Remote card.
              </p>
            </div>

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div>
                <label htmlFor="remote-code-input" className="block text-xs font-medium text-slate-300">
                  Pairing Code
                </label>
                <input
                  id="remote-code-input"
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="NXR-8492-RMT"
                  className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/15 bg-[#07080A] px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-white placeholder:text-slate-600 focus:border-blue-400 focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
                >
                  <Phone className="h-4 w-4" />
                  <span>Connect &amp; Start Call</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateSession}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
                >
                  Generate New Code
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                How Mobile-to-PC Relay Works
              </h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Once paired, your phone and desktop share a single server-synchronized voice relay room. Memories loaded on your account follow the call automatically.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="rounded-lg border border-white/10 bg-[#05070B] p-4">
                <p className="font-semibold text-white">Shared Persona &amp; Memory</p>
                <p className="mt-1 text-slate-400">{memories.length} active memories ready for voice context.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#05070B] p-4">
                <p className="font-semibold text-white">WebSocket Handshake</p>
                <p className="mt-1 text-slate-400">
                  Real-time room sync over <code className="font-mono text-slate-200">/ws/remote</code> with instant end-call control.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left: Particle Call Stage & Audio Controls */}
          <div className="lg:col-span-5 min-w-0 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0F1A] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{activePersona.name} · Remote</p>
                <p className="text-xs font-mono text-slate-400 tabular-nums">
                  Code {activeCode} · {formatCallDuration(elapsedSec)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-300">
                <Radio className="h-3.5 w-3.5" />
                <span>{wsStatus === 'connected' ? 'Relay Connected' : 'Connecting'}</span>
              </span>
            </div>

            <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-lg border border-white/10 bg-[#07080A]">
              <ParticleAvatarCanvas
                form={avatarForm}
                mood={coreMood}
                activeEnergy={sending ? 0.9 : callActive ? 0.45 : 0.15}
                showStarfield={false}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Desktop Listener: {desktopOnline ? 'Online' : 'Standby'}</span>
              <span>Memories: {memories.length}</span>
            </div>

            {/* Persona quick switcher */}
            <div>
              <label htmlFor="remote-persona-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Active Voice Persona
              </label>
              <select
                id="remote-persona-select"
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value as PersonaId)}
                className="w-full min-h-[44px] rounded-lg border border-white/15 bg-[#05070B] px-3 py-2 text-xs text-white focus:border-blue-400 focus:outline-none"
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Touch-ergonomic Call Controls (>=44px hitbox) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className={`inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 sm:px-3 py-2 text-xs font-medium cursor-pointer whitespace-nowrap ${
                  muted
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {muted ? <MicOff className="h-4 w-4 shrink-0" /> : <Mic className="h-4 w-4 text-blue-400 shrink-0" />}
                <span>{muted ? 'Muted' : 'Mic On'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSpeakerOn((s) => !s)}
                className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 sm:px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap"
              >
                {speakerOn ? <Volume2 className="h-4 w-4 text-blue-400 shrink-0" /> : <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />}
                <span>{speakerOn ? 'Speaker' : 'Silent'}</span>
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2 sm:px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer whitespace-nowrap"
              >
                <PhoneOff className="h-4 w-4 shrink-0" />
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* Right: Live Shared Transcript & Voice/Text Prompt Dock */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0F1A] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-base font-semibold text-white">
                Shared Call Transcript
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {transcript.length} turns
              </span>
            </div>

            <div
              ref={transcriptBoxRef}
              className="my-4 h-72 sm:h-80 overflow-y-auto space-y-3 pr-1"
            >
              {transcript.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#05070B] p-4 text-xs text-slate-400">
                  Remote channel open for {activeCode}. Tap Speak or send a prompt below to talk through your character relay.
                </div>
              ) : (
                transcript.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        turn.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'border border-white/10 bg-[#05070B] text-slate-200'
                      }`}
                    >
                      {turn.text}
                    </div>
                    <span className="mt-1 text-[11px] font-mono text-slate-500">
                      {turn.role === 'user' ? 'Phone' : activePersona.name} · {turn.timestamp}
                    </span>
                  </div>
                ))
              )}

              {sending && (
                <div className="max-w-[75%] rounded-xl border border-white/10 bg-[#05070B] px-4 py-2.5 text-xs text-slate-400">
                  Relaying voice turn...
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                  {error}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex flex-wrap gap-1.5">
                {REMOTE_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending || wsStatus !== 'connected'}
                    onClick={() => handleSendTurn(q)}
                    className="min-h-[36px] rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTurn(messageInput);
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={handleSpeakPush}
                  disabled={sending || wsStatus !== 'connected'}
                  aria-label="Speak via microphone"
                  className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 cursor-pointer shrink-0 ${
                    listening
                      ? 'border-blue-400 bg-blue-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Mic className="h-4 w-4 text-blue-400" />
                </button>

                <label htmlFor="remote-message-input" className="sr-only">
                  Speak or type message for Nexora Remote
                </label>
                <input
                  id="remote-message-input"
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message ${activePersona.name} remotely...`}
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-white/15 bg-[#05070B] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={sending || wsStatus !== 'connected' || !messageInput.trim()}
                  aria-label="Send remote message"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 sm:px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
