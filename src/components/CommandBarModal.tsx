import { Command, Compass, CornerDownLeft, Search, Sparkles, Timer, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarForm, CoreMood } from '../data/stonicData';
import { CommandItem, filterCommandActions } from '../utils/stonicLogic';
import { AppRoute } from './Navbar';

interface CommandBarModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
  onChangeCoreMood: (mood: CoreMood) => void;
  onChangeAvatarForm: (form: AvatarForm) => void;
  onStartFocusTimer: (minutes: 25 | 50) => void;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'mood-standby',
    label: 'Switch Core Mood → Standby Titanium',
    section: 'Mood',
    keywords: 'ambient default blue orbital',
  },
  {
    id: 'mood-focus',
    label: 'Switch Core Mood → Focus Amber',
    section: 'Mood',
    keywords: 'amber calm deep work stillness',
  },
  {
    id: 'mood-briefing',
    label: 'Switch Core Mood → Briefing Clarity',
    section: 'Mood',
    keywords: 'morning briefing high clarity radar',
  },
  {
    id: 'mood-night',
    label: 'Switch Core Mood → Night Low-Glare',
    section: 'Mood',
    keywords: 'nocturnal oled dark indigo night',
  },
  {
    id: 'focus-25',
    label: 'Start 25m Deep Focus Timer',
    section: 'Focus',
    keywords: 'pomodoro sprint timer amber 25',
    shortcut: '25:00',
  },
  {
    id: 'focus-50',
    label: 'Start 50m Architecture Sprint',
    section: 'Focus',
    keywords: 'deep work block timer amber 50',
    shortcut: '50:00',
  },
  {
    id: 'form-core',
    label: 'Set Avatar Form → Luminous Core Orb',
    section: 'Form',
    keywords: 'particle sphere orb minimal',
  },
  {
    id: 'form-female',
    label: 'Set Avatar Form → Female Particle Figure',
    section: 'Form',
    keywords: 'nova holographic female',
  },
  {
    id: 'form-male',
    label: 'Set Avatar Form → Male Particle Figure',
    section: 'Form',
    keywords: 'jarvis holographic male',
  },
  {
    id: 'nav-overview',
    label: 'Go to Overview & Live Console',
    section: 'Navigate',
    keywords: 'home console landing',
    shortcut: '/',
  },
  {
    id: 'nav-pricing',
    label: 'Go to Pricing & BYOK Cost Calculator',
    section: 'Navigate',
    keywords: 'lifetime cloud cost calculator pricing 56',
    shortcut: '/pricing',
  },
  {
    id: 'nav-security',
    label: 'Inspect Local-First Security Architecture',
    section: 'Navigate',
    keywords: 'privacy sha256 mic gate byok',
    shortcut: '/security',
  },
  {
    id: 'nav-download',
    label: 'Download Windows Gen 3 Installer',
    section: 'Navigate',
    keywords: 'exe powershell installer release',
    shortcut: '/download',
  },
  {
    id: 'nav-remote',
    label: 'Open Nexora Remote Phone Relay',
    section: 'Navigate',
    keywords: 'qr pairing mobile call websocket',
    shortcut: '/remote',
  },
  {
    id: 'nav-account',
    label: 'Open Account & 3-PC Device Slots',
    section: 'Navigate',
    keywords: 'google devices license usage',
    shortcut: '/account',
  },
];

export function CommandBarModal({
  open,
  onClose,
  onNavigate,
  onChangeCoreMood,
  onChangeAvatarForm,
  onStartFocusTimer,
}: CommandBarModalProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => filterCommandActions(COMMAND_ITEMS, query), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(0);
    }
  }, [results.length, activeIndex]);

  if (!open) return null;

  const executeItem = (item: CommandItem) => {
    switch (item.id) {
      case 'mood-standby':
        onChangeCoreMood('standby');
        break;
      case 'mood-focus':
        onChangeCoreMood('focus');
        break;
      case 'mood-briefing':
        onChangeCoreMood('briefing');
        break;
      case 'mood-night':
        onChangeCoreMood('night');
        break;
      case 'focus-25':
        onStartFocusTimer(25);
        onNavigate('/');
        window.setTimeout(() => {
          document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
        break;
      case 'focus-50':
        onStartFocusTimer(50);
        onNavigate('/');
        window.setTimeout(() => {
          document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
        break;
      case 'form-core':
        onChangeAvatarForm('core');
        break;
      case 'form-female':
        onChangeAvatarForm('female');
        break;
      case 'form-male':
        onChangeAvatarForm('male');
        break;
      case 'nav-overview':
        onNavigate('/');
        break;
      case 'nav-pricing':
        onNavigate('/pricing');
        break;
      case 'nav-security':
        onNavigate('/security');
        break;
      case 'nav-download':
        onNavigate('/download');
        break;
      case 'nav-remote':
        onNavigate('/remote');
        break;
      case 'nav-account':
        onNavigate('/account');
        break;
    }
    onClose();
  };

  const sectionIcon = (section: CommandItem['section']) => {
    if (section === 'Focus') return <Timer className="h-3.5 w-3.5 text-amber-300 shrink-0" />;
    if (section === 'Mood' || section === 'Form') {
      return <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
    }
    return <Compass className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NexoraAI Command Bar"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm px-4 pt-16 sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/15 bg-[#0E1117] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <Search className="h-4 w-4 text-blue-400 shrink-0" />
          <label htmlFor="command-bar-input" className="sr-only">
            Type a command or route
          </label>
          <input
            ref={inputRef}
            id="command-bar-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((idx) => (results.length > 0 ? (idx + 1) % results.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((idx) =>
                  results.length > 0 ? (idx - 1 + results.length) % results.length : 0
                );
              } else if (e.key === 'Enter' && results[activeIndex]) {
                e.preventDefault();
                executeItem(results[activeIndex]);
              }
            }}
            placeholder="Switch Core mood, start a 25m focus sprint, or jump to a view..."
            className="w-full bg-transparent text-sm text-[#F4F2ED] placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command bar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul
          role="listbox"
          aria-label="Available commands"
          className="max-h-80 overflow-y-auto divide-y divide-white/[0.04] p-2"
        >
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-slate-500">
              No matching command. Try &ldquo;focus&rdquo;, &ldquo;byok&rdquo;, &ldquo;night&rdquo;, or &ldquo;download&rdquo;.
            </li>
          ) : (
            results.map((item, idx) => {
              const selected = idx === activeIndex;
              return (
                <li key={item.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'bg-blue-500/15 text-[#F4F2ED]'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {sectionIcon(item.section)}
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500 shrink-0">
                      {item.shortcut && <span>{item.shortcut}</span>}
                      <span>{item.section}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#07080A] px-4 py-2 text-[11px] font-mono text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Command className="h-3 w-3 text-blue-400" />
            <span>Ctrl+Space or Ctrl+K anywhere</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" />
            <span>Run · Esc Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
