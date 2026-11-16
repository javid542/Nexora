import { ArrowLeft, Check, FileText, KeyRound, Lock, MicOff, ShieldCheck } from 'lucide-react';
import { AppRoute } from '../components/Navbar';
import { RELEASE_INFO } from '../data/stonicData';

export type LegalDocRoute = '/security' | '/terms' | '/refund' | '/privacy';

interface SecurityAndLegalPageProps {
  route: LegalDocRoute;
  onNavigate: (route: AppRoute) => void;
}

const DOC_TABS: Array<{ route: LegalDocRoute; label: string }> = [
  { route: '/security', label: 'Security Architecture' },
  { route: '/privacy', label: 'Privacy Policy' },
  { route: '/terms', label: 'License Terms' },
  { route: '/refund', label: 'Refund Policy' },
];

export function SecurityAndLegalPage({ route, onNavigate }: SecurityAndLegalPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
            NexoraAI.com · Trust &amp; Governance
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]">
            {route === '/security' && 'Local-First Security Architecture'}
            {route === '/privacy' && 'Privacy & Audio Isolation Policy'}
            {route === '/terms' && 'Generation 3 License Terms'}
            {route === '/refund' && '100% Access Guarantee & Refund Policy'}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/10 bg-[#0E1117] px-4 py-2 text-xs font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Document Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Trust and legal sections"
        className="mt-6 flex flex-wrap gap-1.5 border border-white/[0.08] bg-[#0E1117] p-1 rounded-lg w-fit"
      >
        {DOC_TABS.map((tab) => {
          const active = route === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onNavigate(tab.route)}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                  : 'text-slate-400 hover:text-[#F4F2ED]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {route === '/security' && (
        <div className="mt-8 space-y-6">
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            NexoraAI.com is engineered around verifiable isolation between your Windows workstation folders, your microphone hardware, and external inference providers.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <Lock className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                Scoped Folder Allowlist
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                AI file operations use a deny-by-default directory allowlist. Credential stores and browser vaults stay locked Blocked while approved folders stay isolated per read-only or read-write scope.
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <ShieldCheck className="h-5 w-5 text-amber-300" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                Autonomy Tiers &amp; 1-Click Kill Switch
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Switch between Read &amp; Draft, Approve First, or Auto-Pilot SOP anytime. Engaging Pause PC Access immediately halts every local playbook and locks remote approvals across desktop and mobile.
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <FileText className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                Verifiable Action Ledger &amp; Undo
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every staged or executed workflow records exact Windows paths, affected items, timestamps, and rollback metadata so reversible operations can be undone in one click.
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <MicOff className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                Zero Silent Microphone Capture
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Audio capture only opens when you explicitly trigger push-to-talk or Start AI voice mode. Neither desktop nor mobile clients record ambient room audio in standby.
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <KeyRound className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                BYOK Direct Key Ownership
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                In Bring Your Own Key mode, credentials live locally inside encrypted desktop settings and talk straight to your chosen AI provider with zero NexoraAI proxy logging.
              </p>
            </article>

            <article className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-2.5">
              <ShieldCheck className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
                SHA-256 Verified Installers &amp; Ephemeral Relay
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every Windows x64 build ships with a PowerShell verifier ({RELEASE_INFO.sha256.slice(0, 12)}…) and Nexora Remote pairing codes (NXR-XXXX-RMT) expire cleanly after session end.
              </p>
            </article>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#F4F2ED]">
                Verify Release Checksum v{RELEASE_INFO.version}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400 break-all">
                SHA-256: {RELEASE_INFO.sha256}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/download')}
              className="rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Download Verification
            </button>
          </div>
        </div>
      )}

      {route === '/privacy' && (
        <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 sm:p-8 space-y-5 text-sm text-slate-300 leading-relaxed">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
            <FileText className="h-4 w-4" />
            <span>Effective 2026 · NexoraAI.com</span>
          </div>
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">1. Account &amp; Device Data</h2>
            <p>
              Signing in with Google stores your email address, display name, active Lifetime/Cloud entitlement, and up to 3 registered Windows PC slot labels in Cloud Firestore strictly to authorize your software across machines.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">2. Memories &amp; Prompts</h2>
            <p>
              Structured memories you save inside the Character Console belong solely to your account and can be edited or permanently deleted at any moment from the console or Account portal.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">3. Voice &amp; Microphone Stream</h2>
            <p>
              Browser and desktop speech capture runs only during active user interaction. Raw microphone audio files are never persisted on NexoraAI servers.
            </p>
          </section>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/[0.08]">
            Privacy requests or account deletion inquiries: support@nexoraai.com
          </p>
        </div>
      )}

      {route === '/terms' && (
        <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 sm:p-8 space-y-5 text-sm text-slate-300 leading-relaxed">
          <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
            NexoraAI Generation 3 End-User License
          </h2>
          <ul className="space-y-3">
            {[
              'A $56 Lifetime License grants perpetual personal or creator use of NexoraAI Generation 3 on up to 3 concurrent Windows 10/11 (x64) PCs.',
              'All Generation 3 software updates, 3D particle core improvements, and World Monitor patches are included at zero extra charge.',
              'Every Lifetime license includes your initial 30 days of managed Nexora Cloud usage ($19 Basic tier equivalent).',
              'After month 1, continue with optional Nexora Cloud ($19/mo Basic or $49/mo Power) or switch permanently to your own provider API keys (BYOK).',
              'License slots may be reassigned or revoked anytime from the Account portal when upgrading hardware.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/[0.08]">
            Commercial team seat licensing inquiries: support@nexoraai.com
          </p>
        </div>
      )}

      {route === '/refund' && (
        <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 sm:p-8 space-y-5 text-sm text-slate-300 leading-relaxed">
          <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
            Transparent Digital License &amp; Cloud Refunds
          </h2>
          <p>
            Because Generation 3 software entitlements and the complimentary first month of Nexora Cloud activate immediately on your Google account, Lifetime purchases are generally final once delivered—subject to our ironclad Working Access Guarantee:
          </p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <span>Full 100% refund if our support team cannot establish working Windows download, installation, or Google sign-in on a supported Windows 10/11 x64 PC.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <span>Duplicate charges or accidental double settlements are refunded in full automatically upon verification.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <span>Optional monthly Nexora Cloud plans ($19 Basic / $49 Power) can be canceled anytime before renewal with zero exit penalty.</span>
            </li>
          </ul>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/[0.08]">
            Submit refund or billing verification tickets to support@nexoraai.com with your Google account email.
          </p>
        </div>
      )}
    </main>
  );
}
