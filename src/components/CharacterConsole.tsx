import {
  Brain,
  Command,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Sliders,
  Square,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AvatarForm,
  CORE_MOODS,
  CoreMood,
  DEFAULT_VAULT_FILTER,
  DEFAULT_VOICE_PROFILE,
  MemoryItem,
  MemoryVaultFilter,
  PERSONAS,
  PersonaId,
  SKILL_ACTIONS,
  SkillAction,
  VoicePersonalityProfile,
} from '../data/stonicData';
import { playCoreChime } from '../utils/audioChime';
import { filterMemoriesByVault, formatCallDuration } from '../utils/stonicLogic';
import { ParticleAvatarCanvas } from './ParticleAvatarCanvas';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface CharacterConsoleProps {
  avatarForm: AvatarForm;
  onChangeAvatarForm: (form: AvatarForm) => void;
  coreMood?: CoreMood;
  onChangeCoreMood?: (mood: CoreMood) => void;
  memories: MemoryItem[];
  onAddMemory: (text: string, category: MemoryItem['category']) => void;
  onDeleteMemory: (id: string) => void;
  onUsageIncrement?: () => void;
  onTriggerWorldBriefing?: () => void;
  focusDurationMin?: 25 | 50;
  focusSecondsLeft?: number;
  focusRunning?: boolean;
  onStartFocusTimer?: (minutes: 25 | 50) => void;
  onToggleFocusPause?: () => void;
  onResetFocusTimer?: () => void;
  onOpenCommandBar?: () => void;
}

type CircuitTab = 'chat' | 'memory' | 'skills' | 'settings';

const QUICK_PROMPTS = [
  'Introduce yourself and check my workspace.',
  'What do you remember about me?',
  'Give me a calm late-night focus prompt.',
];

const VOICE_PROFILE_STORAGE_KEY = 'nexora_voice_profile_v1';
const VAULT_FILTER_STORAGE_KEY = 'nexora_vault_filter_v1';

function loadStoredVoiceProfile(): VoicePersonalityProfile {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PROFILE;
  try {
    const raw = window.localStorage.getItem(VOICE_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_PROFILE;
    const p = JSON.parse(raw) as Partial<VoicePersonalityProfile>;
    return {
      warmth: typeof p.warmth === 'number' ? p.warmth : DEFAULT_VOICE_PROFILE.warmth,
      conciseness:
        typeof p.conciseness === 'number' ? p.conciseness : DEFAULT_VOICE_PROFILE.conciseness,
      pitch: typeof p.pitch === 'number' ? p.pitch : DEFAULT_VOICE_PROFILE.pitch,
      rate: typeof p.rate === 'number' ? p.rate : DEFAULT_VOICE_PROFILE.rate,
    };
  } catch {
    return DEFAULT_VOICE_PROFILE;
  }
}

function loadStoredVaultFilter(): MemoryVaultFilter {
  if (typeof window === 'undefined') return DEFAULT_VAULT_FILTER;
  try {
    const raw = window.localStorage.getItem(VAULT_FILTER_STORAGE_KEY);
    if (!raw) return DEFAULT_VAULT_FILTER;
    const p = JSON.parse(raw) as Partial<MemoryVaultFilter>;
    return {
      identity: p.identity !== false,
      preference: p.preference !== false,
      context: p.context !== false,
    };
  } catch {
    return DEFAULT_VAULT_FILTER;
  }
}

export function CharacterConsole({
  avatarForm,
  onChangeAvatarForm,
  coreMood = 'standby',
  onChangeCoreMood,
  memories,
  onAddMemory,
  onDeleteMemory,
  onUsageIncrement,
  onTriggerWorldBriefing,
  focusDurationMin = 25,
  focusSecondsLeft = 25 * 60,
  focusRunning = false,
  onStartFocusTimer,
  onToggleFocusPause,
  onResetFocusTimer,
  onOpenCommandBar,
}: CharacterConsoleProps) {
  const [aiStarted, setAiStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<CircuitTab>('chat');
  const [personaId, setPersonaId] = useState<PersonaId>('jarvis');
  const [customInstruction, setCustomInstruction] = useState(
    'Speak like an attentive orbital mission director with warm focus.'
  );
  const [voiceProfile, setVoiceProfile] = useState<VoicePersonalityProfile>(loadStoredVoiceProfile);
  const [vaultFilter, setVaultFilter] = useState<MemoryVaultFilter>(loadStoredVaultFilter);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryItem['category']>('preference');

  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Core standby. Click Start AI or send a message below to talk with me.',
      timestamp: 'Ready',
    },
  ]);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);
  const activePersona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];
  const activePromptMemories = useMemo(
    () => filterMemoriesByVault(memories, vaultFilter),
    [memories, vaultFilter]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(VOICE_PROFILE_STORAGE_KEY, JSON.stringify(voiceProfile));
    } catch {
      // Ignore storage failure
    }
  }, [voiceProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VAULT_FILTER_STORAGE_KEY, JSON.stringify(vaultFilter));
    } catch {
      // Ignore storage failure
    }
  }, [vaultFilter]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  function speakText(text: string, forceSpeak = false) {
    if ((!voiceEnabled && !forceSpeak) || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const pitchOffset = voiceProfile.pitch - 1;
      const rateOffset = voiceProfile.rate - 1;
      utterance.pitch = Math.max(0.6, Math.min(1.6, activePersona.voicePitch + pitchOffset));
      utterance.rate = Math.max(0.7, Math.min(1.5, activePersona.voiceRate + rateOffset));
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  function handleToggleStart() {
    if (!aiStarted) {
      setAiStarted(true);
      playCoreChime('activate');
      const greeting = `${activePersona.name} online. I have ${activePromptMemories.length} active memories loaded. How can I help around your desk today?`;
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakText(greeting);
    } else {
      setAiStarted(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    }
  }

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    if (!aiStarted) {
      setAiStarted(true);
      playCoreChime('activate');
    }

    setError(null);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: nowTime,
    };

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/character/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          personaId,
          avatarForm,
          memories: activePromptMemories,
          customInstruction,
          voiceProfile,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach character core.');
      }
      const replyText = data.reply || 'Acknowledged.';
      playCoreChime('reply');
      onUsageIncrement?.();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakText(replyText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to Gemini core.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleMicInput() {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('Browser voice recognition is unavailable here. Type a message below to test live AI responses.');
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
        setError('Microphone permission was denied or unavailable.');
      };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          sendMessage(transcript);
        }
      };
      recognition.start();
    } catch {
      setListening(false);
      setError('Unable to initialize microphone capture in this browser.');
    }
  }

  function handleRunSkill(skill: SkillAction) {
    playCoreChime('skill');
    setActiveTab('chat');
    if (skill.id === 'skill-radar' && onTriggerWorldBriefing) {
      onTriggerWorldBriefing();
    }
    sendMessage(skill.commandHint);
  }

  function handleMemorySubmit(e: FormEvent) {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    onAddMemory(newMemoryText.trim(), newMemoryCategory);
    setNewMemoryText('');
  }

  const coreEnergy = loading ? 0.85 : speaking ? 0.95 : aiStarted ? 0.35 : 0.08;

  return (
    <section
      id="experience"
      aria-labelledby="character-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/10"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
          The Character · Interactive Core
        </p>
        <h2
          id="character-heading"
          className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance"
        >
          Meet the mind you talk to.
        </h2>
        <p className="mt-3 text-base text-slate-400 leading-relaxed">
          Hit Start AI, choose a persona, add persistent memories, and talk directly with the live Gemini-powered core. Four circuits shape who it is.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Left: Live 3D Particle Core + Primary Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0F1A] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{activePersona.name}</p>
              <p className="text-xs text-slate-400">{activePersona.role}</p>
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              aria-label={voiceEnabled ? 'Mute voice output' : 'Enable voice output'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
            >
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
              <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
            </button>
          </div>

          <div className="relative my-4 h-64 sm:h-72 w-full overflow-hidden rounded-lg border border-white/10 bg-[#07080A]">
            <ParticleAvatarCanvas
              form={avatarForm}
              mood={coreMood}
              activeEnergy={coreEnergy}
              showStarfield={false}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>
                State: {loading ? 'Thinking' : speaking ? 'Speaking' : aiStarted ? 'Listening' : 'Standby'} ·{' '}
                {CORE_MOODS.find((m) => m.id === coreMood)?.label || 'Standby'}
              </span>
              <span>Memories: {memories.length}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleStart}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  aiStarted
                    ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
                    : 'bg-white text-slate-950 hover:bg-blue-100'
                }`}
              >
                {aiStarted ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{aiStarted ? 'Stop AI' : 'Start AI'}</span>
              </button>

              <button
                type="button"
                onClick={handleMicInput}
                disabled={loading}
                aria-label="Speak with microphone"
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  listening
                    ? 'border-blue-400 bg-blue-500/20 text-white'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Mic className="h-4 w-4 text-blue-400" />
                <span>{listening ? 'Listening...' : 'Speak'}</span>
              </button>
            </div>

            {/* 25m / 50m Deep Focus Sprint Timer Synced to 3D Core */}
            {onStartFocusTimer && (
              <div className="rounded-lg border border-white/10 bg-[#07080A] px-3.5 py-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Timer className={`h-3.5 w-3.5 ${focusRunning ? 'text-amber-300' : 'text-blue-400'}`} />
                    <span>Focus Timer</span>
                  </span>
                  <span
                    aria-label="Focus timer remaining"
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      focusRunning ? 'text-amber-300' : 'text-[#F4F2ED]'
                    }`}
                  >
                    {formatCallDuration(focusSecondsLeft)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-md border border-white/10 bg-[#0E1117] p-0.5 gap-0.5">
                    {([25, 50] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onStartFocusTimer(mins)}
                        className={`rounded px-2.5 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                          focusDurationMin === mins
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        focusRunning ? onToggleFocusPause?.() : onStartFocusTimer(focusDurationMin)
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer"
                    >
                      {focusRunning ? (
                        <>
                          <Pause className="h-3 w-3 text-amber-300" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 text-amber-300" />
                          <span>Start Focus</span>
                        </>
                      )}
                    </button>
                    {onResetFocusTimer && (
                      <button
                        type="button"
                        onClick={onResetFocusTimer}
                        aria-label="Reset focus timer"
                        className="inline-flex items-center justify-center rounded-md border border-white/10 p-1 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: 4 Circuits Workspace */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-white/10 bg-[#0A0F1A] overflow-hidden">
          {/* Segmented Tabs for 4 Circuits */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#070B13] p-2">
            <div
              role="tablist"
              aria-label="Character circuits"
              className="flex flex-wrap items-center gap-1"
            >
              {(
                [
                  { id: 'chat', label: 'Live Console', icon: Zap },
                  {
                    id: 'memory',
                    label: `Memory (${activePromptMemories.length}/${memories.length})`,
                    icon: Brain,
                  },
                  { id: 'skills', label: 'Skills', icon: Sliders },
                  { id: 'settings', label: 'Character & Settings', icon: Settings2 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-blue-500/15 text-white border border-blue-400/30'
                        : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-blue-400" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {onOpenCommandBar && (
              <button
                type="button"
                onClick={onOpenCommandBar}
                aria-label="Open Command Bar"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0E1117] px-2.5 py-1.5 text-[11px] font-mono text-slate-300 hover:border-blue-400/40 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <Command className="h-3 w-3 text-blue-400" />
                <span>Ctrl+Space</span>
              </button>
            )}
          </div>

          {/* Tab Panels */}
          {activeTab === 'chat' && (
            <div className="flex flex-1 flex-col justify-between p-5">
              <div ref={chatContainerRef} className="h-72 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'border border-white/10 bg-[#05070B] text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="mt-1 text-[11px] font-mono text-slate-500">
                      {m.role === 'user' ? 'You' : activePersona.name} · {m.timestamp}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="max-w-[75%] rounded-xl border border-white/10 bg-[#05070B] px-4 py-2.5 text-sm text-slate-400">
                    Synthesizing response...
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp}
                      type="button"
                      disabled={loading}
                      onClick={() => sendMessage(qp)}
                      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {qp}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <label htmlFor="character-chat-input" className="sr-only">
                    Message your NexoraAI character
                  </label>
                  <input
                    id="character-chat-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Talk to ${activePersona.name}...`}
                    className="flex-1 rounded-lg border border-white/15 bg-[#05070B] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Send message to AI character"
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="flex-1 p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-white">
                    Structured Memory Vault
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Toggle entire memory categories on or off to control what {activePersona.name} sees in live context.
                  </p>
                </div>
                <span className="font-mono text-[11px] text-blue-300 tabular-nums">
                  Active: {activePromptMemories.length} / {memories.length}
                </span>
              </div>

              {/* Category Vault Toggles */}
              <div
                role="group"
                aria-label="Memory vault category toggles"
                className="grid grid-cols-3 gap-2"
              >
                {(
                  [
                    { id: 'identity', label: 'Identity' },
                    { id: 'preference', label: 'Preference' },
                    { id: 'context', label: 'Context' },
                  ] as const
                ).map((cat) => {
                  const enabled = vaultFilter[cat.id];
                  const count = memories.filter((m) => m.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={enabled}
                      onClick={() =>
                        setVaultFilter((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                      }
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        enabled
                          ? 'border-blue-400/40 bg-blue-500/10 text-[#F4F2ED]'
                          : 'border-white/10 bg-[#05070B] text-slate-500'
                      }`}
                    >
                      <span>
                        {cat.label} ({count})
                      </span>
                      <span className="font-mono text-[10px] uppercase">
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleMemorySubmit} className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="new-memory-input" className="sr-only">
                  Add a memory
                </label>
                <input
                  id="new-memory-input"
                  type="text"
                  maxLength={280}
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="e.g. Call me Alex, I work late nights on 3D apps"
                  className="flex-1 rounded-lg border border-white/15 bg-[#05070B] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
                />
                <label htmlFor="new-memory-cat" className="sr-only">
                  Memory category
                </label>
                <select
                  id="new-memory-cat"
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value as MemoryItem['category'])}
                  className="rounded-lg border border-white/15 bg-[#05070B] px-3 py-2 text-xs text-slate-200 focus:border-blue-400 focus:outline-none"
                >
                  <option value="identity">Identity</option>
                  <option value="preference">Preference</option>
                  <option value="context">Context</option>
                </select>
                <button
                  type="submit"
                  disabled={!newMemoryText.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-blue-100 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Memory</span>
                </button>
              </form>

              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {memories.length === 0 ? (
                  <li className="rounded-lg border border-white/10 bg-[#05070B] p-4 text-xs text-slate-400">
                    No memories saved yet. Add one above and ask your character what it knows.
                  </li>
                ) : (
                  memories.map((mem) => {
                    const included = vaultFilter[mem.category];
                    return (
                      <li
                        key={mem.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-opacity ${
                          included
                            ? 'border-white/10 bg-[#05070B]'
                            : 'border-white/5 bg-[#05070B]/50 opacity-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-100">{mem.text}</p>
                          <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                            {mem.category} · {mem.createdAt}
                            {!included ? ' · Excluded' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteMemory(mem.id)}
                          aria-label={`Delete memory: ${mem.text}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-red-300 cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="flex-1 p-5 space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Everyday Desktop &amp; Core Skills
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Trigger an action below to see how your AI character handles diagnostics, briefings, and World Monitor synchronization.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SKILL_ACTIONS.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleRunSkill(skill)}
                    className="flex flex-col items-start justify-between rounded-xl border border-white/10 bg-[#05070B] p-4 text-left transition-colors hover:border-blue-400/50 hover:bg-[#0D1424] cursor-pointer"
                  >
                    <div>
                      <p className="text-[11px] font-mono text-blue-400">{skill.category}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{skill.name}</p>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{skill.description}</p>
                    </div>
                    <span className="mt-3 text-xs font-medium text-blue-300">
                      Run skill →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 p-5 space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Character Persona &amp; Avatar Form
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Select a personality preset and visual particle form. Changes apply immediately to the 3D core and AI replies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PERSONAS.map((p) => {
                  const selected = p.id === personaId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPersonaId(p.id);
                        onChangeAvatarForm(p.defaultForm);
                      }}
                      className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-blue-400 bg-blue-500/15 text-white'
                          : 'border-white/10 bg-[#05070B] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-[11px] text-blue-300">{p.role}</p>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{p.tagline}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300 mb-2">Particle Form</p>
                <div className="inline-flex rounded-lg border border-white/10 bg-[#07080A] p-1 gap-1">
                  {(['core', 'female', 'male'] as AvatarForm[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => onChangeAvatarForm(f)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                        avatarForm === f
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {onChangeCoreMood && (
                <div>
                  <p className="text-xs font-medium text-slate-300 mb-2">Core Environment Mood</p>
                  <div className="inline-flex flex-wrap rounded-lg border border-white/10 bg-[#07080A] p-1 gap-1">
                    {CORE_MOODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onChangeCoreMood(m.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          coreMood === m.id
                            ? 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice & Personality Mixer */}
              <div className="rounded-xl border border-white/10 bg-[#05070B] p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#F4F2ED]">Voice &amp; Personality Mixer</p>
                    <p className="text-[11px] text-slate-400">Calibrates AI tone and Web Speech cadence live.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      speakText(
                        `${activePersona.name} cadence check. Warmth at ${voiceProfile.warmth} percent, conciseness at ${voiceProfile.conciseness} percent.`,
                        true
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-400/35 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-medium text-blue-200 hover:bg-blue-500/20 cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Preview Cadence</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <label htmlFor="mixer-warmth">Warmth</label>
                      <span className="font-mono text-slate-400 tabular-nums">{voiceProfile.warmth}%</span>
                    </div>
                    <input
                      id="mixer-warmth"
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={voiceProfile.warmth}
                      onChange={(e) =>
                        setVoiceProfile((p) => ({ ...p, warmth: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <label htmlFor="mixer-concise">Conciseness</label>
                      <span className="font-mono text-slate-400 tabular-nums">{voiceProfile.conciseness}%</span>
                    </div>
                    <input
                      id="mixer-concise"
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={voiceProfile.conciseness}
                      onChange={(e) =>
                        setVoiceProfile((p) => ({ ...p, conciseness: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <label htmlFor="mixer-pitch">Voice Pitch</label>
                      <span className="font-mono text-slate-400 tabular-nums">{voiceProfile.pitch.toFixed(2)}×</span>
                    </div>
                    <input
                      id="mixer-pitch"
                      type="range"
                      min={0.75}
                      max={1.35}
                      step={0.05}
                      value={voiceProfile.pitch}
                      onChange={(e) =>
                        setVoiceProfile((p) => ({ ...p, pitch: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <label htmlFor="mixer-rate">Speaking Tempo</label>
                      <span className="font-mono text-slate-400 tabular-nums">{voiceProfile.rate.toFixed(2)}×</span>
                    </div>
                    <input
                      id="mixer-rate"
                      type="range"
                      min={0.8}
                      max={1.25}
                      step={0.05}
                      value={voiceProfile.rate}
                      onChange={(e) =>
                        setVoiceProfile((p) => ({ ...p, rate: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {personaId === 'custom' && (
                <div>
                  <label htmlFor="custom-persona-input" className="block text-xs font-medium text-slate-300">
                    Custom Character Directive
                  </label>
                  <textarea
                    id="custom-persona-input"
                    rows={2}
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#05070B] p-3 text-xs text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
