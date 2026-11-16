import { Cpu, Globe2, KeyRound, Smartphone } from 'lucide-react';
import { AppRoute } from '../components/Navbar';

interface GuidePageProps {
  onNavigate: (route: AppRoute) => void;
}

const STEPS = [
  {
    num: '01',
    title: 'Install NexoraAI on Windows 10 or 11',
    icon: Cpu,
    body: 'Download the x64 installer and verification script from the Download page, verify the SHA-256 checksum, and sign in with the Google email linked to your Lifetime license.',
  },
  {
    num: '02',
    title: 'Activate Your Free Month of Nexora Cloud',
    icon: Globe2,
    body: 'New Lifetime owners get 30 days of Nexora Cloud automatically. Choose JARVIS, Nova, Atlas, or a custom core, set your mood (Standby, Focus, Briefing, Night), and talk immediately.',
  },
  {
    num: '03',
    title: 'Choose Nexora Cloud or Bring Your Own Key (BYOK)',
    icon: KeyRound,
    body: 'After your first month, either stay on Nexora Cloud ($19 Basic or $49 Power) or connect your personal AI API key locally inside Settings for direct billing with zero limits.',
  },
  {
    num: '04',
    title: 'Pair Nexora Remote to Your Phone',
    icon: Smartphone,
    body: 'While your PC stays online at home, open Settings → Nexora Remote in the desktop app and scan the NXR-XXXX-RMT QR code with your phone to talk seamlessly over earbuds.',
  },
];

export function GuidePage({ onNavigate }: GuidePageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
          Getting Started Guide
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#F4F2ED]">
          Up and running in 3 minutes.
        </h1>
        <p className="mt-3 text-base text-slate-400 leading-relaxed">
          Follow this step-by-step walkthrough to verify and install Generation 3, customize your Core mood and memories, and pair Nexora Remote.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-blue-400">{step.num}</span>
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">{step.title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[#F4F2ED]">
            Want to test the live AI core before installing?
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Jump into the interactive Core console on the Overview page to switch moods, edit memories, and test World Monitor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="rounded-lg bg-[#F4F2ED] px-5 py-2.5 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer whitespace-nowrap shrink-0"
        >
          Open Interactive Core
        </button>
      </div>
    </main>
  );
}
