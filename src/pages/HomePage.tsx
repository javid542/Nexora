import { ArrowRight, Check, Download, KeyRound, Laptop, Lock, Mic, MicOff, Shield, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  AvatarForm,
  CORE_MOODS,
  CoreMood,
  IN_APP_TESTIMONIALS,
  MemoryItem,
  SOCIAL_TESTIMONIALS,
  Testimonial,
} from '../data/stonicData';
import { CharacterConsole } from '../components/CharacterConsole';
import { CheckoutPlanType } from '../components/CheckoutModal';
import { FaqSection } from '../components/FaqSection';
import { AppRoute } from '../components/Navbar';
import { ParticleAvatarCanvas } from '../components/ParticleAvatarCanvas';
import { QrPairingCard } from '../components/QrPairingCard';
import { WorldMonitorSection } from '../components/WorldMonitorSection';

interface HomePageProps {
  avatarForm: AvatarForm;
  onChangeAvatarForm: (form: AvatarForm) => void;
  coreMood: CoreMood;
  onChangeCoreMood: (mood: CoreMood) => void;
  memories: MemoryItem[];
  onAddMemory: (text: string, category: MemoryItem['category']) => void;
  onDeleteMemory: (id: string) => void;
  onUsageIncrement?: () => void;
  onNavigate: (route: AppRoute, query?: string) => void;
  onOpenCheckout: (plan: CheckoutPlanType) => void;
  onOpenProof: (testimonial: Testimonial) => void;
  focusDurationMin: 25 | 50;
  focusSecondsLeft: number;
  focusRunning: boolean;
  onStartFocusTimer: (minutes: 25 | 50) => void;
  onToggleFocusPause: () => void;
  onResetFocusTimer: () => void;
  onOpenCommandBar: () => void;
}

const HUD_FEMALE_IMG = '/src/assets/images/desktop_hud_female_1794588611458.jpg';
const HUD_MALE_IMG = '/src/assets/images/desktop_hud_male_1794588612412.jpg';
const REMOTE_CALL_IMG = '/src/assets/images/stonic_remote_call_1794588612955.jpg';

export function HomePage({
  avatarForm,
  onChangeAvatarForm,
  coreMood,
  onChangeCoreMood,
  memories,
  onAddMemory,
  onDeleteMemory,
  onUsageIncrement,
  onNavigate,
  onOpenCheckout,
  onOpenProof,
  focusDurationMin,
  focusSecondsLeft,
  focusRunning,
  onStartFocusTimer,
  onToggleFocusPause,
  onResetFocusTimer,
  onOpenCommandBar,
}: HomePageProps) {
  const [showcaseGender, setShowcaseGender] = useState<'female' | 'male'>('female');
  const [hudImgError, setHudImgError] = useState(false);
  const [remoteImgError, setRemoteImgError] = useState(false);

  const activeMoodCfg = CORE_MOODS.find((m) => m.id === coreMood) || CORE_MOODS[0];

  const scrollToExperience = () => {
    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main>
      {/* 1. HERO SECTION */}
      <section
        aria-label="Hero Introduction"
        className="relative min-h-[560px] sm:min-h-[660px] flex flex-col items-center justify-center overflow-hidden px-4 pt-4 pb-20 sm:px-6 sm:py-12"
      >
        <div className="relative w-full">
          <div className="mx-auto h-52 sm:h-80 w-full">
            <ParticleAvatarCanvas form={avatarForm} mood={coreMood} activeEnergy={0.28} />
          </div>

          <div className="relative z-10 mx-auto -mt-2 flex max-w-4xl flex-col items-center text-center">
            {/* Avatar Form & Reactive Core Mood Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div
                role="group"
                aria-label="Avatar form selector"
                className="inline-flex rounded-lg border border-white/15 bg-[#0E1117] p-1 gap-1"
              >
                {(['core', 'female', 'male'] as AvatarForm[]).map((mode) => {
                  const active = avatarForm === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeAvatarForm(mode)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                          : 'text-slate-400 hover:text-[#F4F2ED]'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Core environment mood"
                className="inline-flex rounded-lg border border-white/15 bg-[#0E1117] p-1 gap-1"
              >
                {CORE_MOODS.map((m) => {
                  const active = coreMood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChangeCoreMood(m.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? m.id === 'focus'
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                            : 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-[#F4F2ED] border border-transparent'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">{activeMoodCfg.description}</p>

            <h1 className="mt-4 sm:mt-5 max-w-3xl font-display text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#F4F2ED] leading-[1.08] text-balance">
              Your calm, spatial{' '}
              <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200 bg-clip-text text-transparent">
                desktop companion
              </span>{' '}
              built for Windows.
            </h1>

            <p className="mt-3 sm:mt-4 max-w-xl text-sm sm:text-lg text-slate-400 leading-relaxed">
              NexoraAI listens on push-to-talk, recalls structured memory, tracks live global radar, and bridges calls straight to your phone.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToExperience}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F4F2ED] px-5 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>Try Live Core</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/pricing')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0E1117] px-5 py-2.5 text-sm font-medium text-[#F4F2ED] transition-colors hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>See Plans</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/download')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0E1117] px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4 text-blue-400" />
                <span>Download Windows</span>
              </button>
            </div>

            <p className="mt-4 max-w-sm sm:max-w-none text-xs text-slate-500">
              Windows 10 / 11 x64 · Local-first mic privacy · $56 Lifetime across 3 PCs ·{' '}
              <button
                type="button"
                onClick={onOpenCommandBar}
                className="font-mono text-slate-300 underline decoration-white/25 underline-offset-4 hover:text-white cursor-pointer"
              >
                Command Bar (Ctrl+Space)
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* 2. INSIDE NEXORAAI SHOWCASE */}
      <section
        aria-labelledby="inside-nexora-heading"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
              Inside NexoraAI
            </p>
            <h2
              id="inside-nexora-heading"
              className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
            >
              Meet NexoraAI Generation 3.
            </h2>
            <p className="mt-3 text-base text-slate-400 leading-relaxed">
              An ambient spatial workspace engineered in Matte Obsidian — with voice cadence, structured memory, and adaptive Core forms synced across desktop and phone.
            </p>
          </div>

          <div
            role="group"
            aria-label="Preview desktop HUD gender"
            className="inline-flex rounded-lg border border-white/10 bg-[#0E1117] p-1 gap-1 shrink-0 self-start"
          >
            <button
              type="button"
              onClick={() => {
                setShowcaseGender('female');
                onChangeAvatarForm('female');
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showcaseGender === 'female' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-[#F4F2ED]'
              }`}
            >
              Female HUD
            </button>
            <button
              type="button"
              onClick={() => {
                setShowcaseGender('male');
                onChangeAvatarForm('male');
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                showcaseGender === 'male' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-[#F4F2ED]'
              }`}
            >
              Male HUD
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1117]">
          <div className="relative aspect-video w-full bg-[#07080A]">
            {!hudImgError ? (
              <img
                src={showcaseGender === 'female' ? HUD_FEMALE_IMG : HUD_MALE_IMG}
                alt={
                  showcaseGender === 'female'
                    ? 'NexoraAI desktop HUD with female particle avatar wired to Memory, Skills, Character, and Settings'
                    : 'NexoraAI desktop HUD with male JARVIS particle avatar and World Monitor globe'
                }
                referrerPolicy="no-referrer"
                onError={() => setHudImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                <Sparkles className="h-8 w-8 text-blue-400" />
                <p className="mt-3 text-sm font-medium text-[#F4F2ED]">
                  NexoraAI {showcaseGender === 'female' ? 'Female' : 'Male'} Desktop Interface
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Wired to Memory, Skills, Character, Settings, and World Monitor
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-3 sm:divide-y-0 sm:divide-x border-t border-white/[0.08]">
            <div className="p-5">
              <p className="text-sm font-semibold text-[#F4F2ED]">Natural Voice Cadence</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Speaks concisely on demand with distinct vocal pitch and tempo for each companion preset.
              </p>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-[#F4F2ED]">Reactive Core States</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Shift between Standby, Focus amber, Briefing clarity, and low-glare Night modes without leaving your workflow.
              </p>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-[#F4F2ED]">Transparent Security</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Explicit push-to-talk mic isolation, direct BYOK key ownership, and SHA-256 signed installers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE CHARACTER CONSOLE (LIVE GEMINI) */}
      <CharacterConsole
        avatarForm={avatarForm}
        onChangeAvatarForm={onChangeAvatarForm}
        coreMood={coreMood}
        onChangeCoreMood={onChangeCoreMood}
        memories={memories}
        onAddMemory={onAddMemory}
        onDeleteMemory={onDeleteMemory}
        onUsageIncrement={onUsageIncrement}
        focusDurationMin={focusDurationMin}
        focusSecondsLeft={focusSecondsLeft}
        focusRunning={focusRunning}
        onStartFocusTimer={onStartFocusTimer}
        onToggleFocusPause={onToggleFocusPause}
        onResetFocusTimer={onResetFocusTimer}
        onOpenCommandBar={onOpenCommandBar}
        onTriggerWorldBriefing={() =>
          document.getElementById('world-monitor')?.scrollIntoView({ behavior: 'smooth' })
        }
      />

      {/* 4. WORLD MONITOR (3D GLOBE + 2D COMMAND MAP + HEADLINES) */}
      <WorldMonitorSection />

      {/* 5. NEXORA REMOTE SECTION */}
      <section
        aria-labelledby="remote-heading"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
                Nexora Remote
              </p>
              <h2
                id="remote-heading"
                className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
              >
                Your workstation core, in your pocket.
              </h2>
              <p className="mt-3 text-base text-slate-400 leading-relaxed">
                Step out with earbuds and stay connected to your PC&apos;s character and saved memories over an ephemeral WebSocket relay.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-4">
                <Laptop className="h-5 w-5 text-blue-400" />
                <p className="mt-2 text-xs font-semibold text-[#F4F2ED]">1. PC at Home</p>
                <p className="mt-1 text-[11px] text-slate-400">Run NexoraAI on Windows</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-4">
                <Smartphone className="h-5 w-5 text-blue-400" />
                <p className="mt-2 text-xs font-semibold text-[#F4F2ED]">2. Pair QR Code</p>
                <p className="mt-1 text-[11px] text-slate-400">Settings → Nexora Remote</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-4">
                <Mic className="h-5 w-5 text-blue-400" />
                <p className="mt-2 text-xs font-semibold text-[#F4F2ED]">3. Talk Anywhere</p>
                <p className="mt-1 text-[11px] text-slate-400">Live memory relay</p>
              </div>
            </div>

            <QrPairingCard
              onLaunchRemote={(code) => onNavigate('/remote', `?code=${encodeURIComponent(code)}`)}
            />
          </div>

          <div className="lg:col-span-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E1117] flex flex-col">
            <div className="relative flex-1 min-h-[280px] bg-[#07080A]">
              {!remoteImgError ? (
                <img
                  src={REMOTE_CALL_IMG}
                  alt="Smartphone running a live Nexora Remote voice call with Mute and End Call buttons"
                  referrerPolicy="no-referrer"
                  onError={() => setRemoteImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <Smartphone className="h-10 w-10 text-blue-400" />
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.08] px-5 py-4 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-[#F4F2ED]">Synchronized Voice Relay</span>
              <span>Shared persona &amp; memory · NXR-XXXX-RMT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LOCAL-FIRST SECURITY & OPERATOR PROOF */}
      <section
        aria-labelledby="proof-heading"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
              Architectural Trust &amp; Early Operators
            </p>
            <h2
              id="proof-heading"
              className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
            >
              Engineered for daily focus, not hype.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/security')}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-white/15 bg-[#0E1117] px-4 py-2.5 text-xs font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>Inspect Security Architecture →</span>
          </button>
        </div>

        {/* 4 Architectural Verification Guarantees */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-2">
            <MicOff className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold text-[#F4F2ED]">Push-to-Talk Mic Gate</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero passive background microphone capture. Audio opens only on explicit user action.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-2">
            <KeyRound className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold text-[#F4F2ED]">Direct BYOK Billing</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your own provider keys with zero NexoraAI markup or hidden usage throttling.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold text-[#F4F2ED]">SHA-256 Signed Builds</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every installer includes an inspectable PowerShell verifier and cryptographic hash.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-2">
            <Lock className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold text-[#F4F2ED]">3-PC Atomic Licensing</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Revoke and reassign hardware slots anytime inside your Google-bound Account portal.
            </p>
          </div>
        </div>

        {/* Early-Access Operator Notes */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IN_APP_TESTIMONIALS.map((t) => (
            <article
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E1117] p-5"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-[#F4F2ED]">{t.author}</span>
                  <span className="font-mono text-amber-300 tabular-nums">{t.rating}★</span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-slate-500">{t.subtitle}</p>
                <p className="mt-3 text-sm text-slate-200 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              </div>
              <p className="mt-4 text-[11px] font-mono text-slate-500">{t.channel}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIAL_TESTIMONIALS.map((t) => (
            <article
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E1117] p-5"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-[#F4F2ED]">{t.author}</p>
                    <p className="text-[11px] text-slate-400">{t.subtitle}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{t.channel}</span>
                </div>
                <p className="mt-3 text-sm text-slate-200 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <span className="text-[11px] font-mono text-slate-500">{t.time || 'Verified'}</span>
                {t.hasProof && (
                  <button
                    type="button"
                    onClick={() => onOpenProof(t)}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Read Case Note →
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 7. PRICING SUMMARY SECTION */}
      <section
        aria-labelledby="pricing-summary-heading"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
            NexoraAI · Generation 3
          </p>
          <h2
            id="pricing-summary-heading"
            className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
          >
            Own your desk companion for life.
          </h2>
          <p className="mt-3 text-base text-slate-400">
            One $56 payment covers up to 3 Windows PCs permanently. Run your own API keys (BYOK) or add managed Nexora Cloud monthly.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-blue-400/35 bg-[#0E1117] p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold text-[#F4F2ED]">
                  Lifetime · Generation 3
                </h3>
                <span className="text-xs font-mono text-blue-300">Best Value</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-[#F4F2ED] tabular-nums">$56</span>
                <span className="text-sm text-slate-400">one-time · No subscription required</span>
              </div>
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                {[
                  'All future Gen 3 desktop updates included',
                  'First month of Nexora Cloud free ($19 value)',
                  'Up to 3 active Windows PCs simultaneously',
                  'Bring Your Own API Key (BYOK) with zero caps',
                  'Direct email & member channel support',
                  'SHA-256 verified Windows installer script',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onOpenCheckout('lifetime')}
                className="rounded-lg bg-[#F4F2ED] px-5 py-2.5 text-sm font-semibold text-[#07080A] hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Get Lifetime — $56
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/pricing')}
                className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-[#F4F2ED] hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Compare All Plans
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 sm:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Shield className="h-4 w-4 text-blue-400" />
                <span>Optional Managed Inference</span>
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#F4F2ED]">Nexora Cloud</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Skip external API billing completely. We manage fast &amp; deep reasoning models across all 3 Lifetime PCs.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#07080A] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#F4F2ED]">Basic</p>
                    <p className="text-xs text-slate-400">Everyday voice &amp; fast/deep models</p>
                  </div>
                  <span className="font-mono text-base font-semibold text-[#F4F2ED] tabular-nums">$19/mo</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#07080A] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#F4F2ED]">Power</p>
                    <p className="text-xs text-slate-400">3.5× daily &amp; monthly usage + priority queue</p>
                  </div>
                  <span className="font-mono text-base font-semibold text-[#F4F2ED] tabular-nums">$49/mo</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/cloud')}
              className="mt-8 w-full rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-[#F4F2ED] hover:bg-white/10 transition-colors cursor-pointer"
            >
              See Nexora Cloud Plans →
            </button>
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <FaqSection />
    </main>
  );
}
