import { AppRoute } from './Navbar';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07080A] text-slate-400">
      {/* Bottom CTA Strip */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 border-b border-white/[0.08]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F2ED]">
              Calm intelligence for your Windows desk.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed">
              Download Generation 3 free, verify the SHA-256 checksum, and activate Lifetime across up to 3 Windows workstations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/download')}
              className="rounded-lg bg-[#F4F2ED] px-5 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Download for Windows
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/pricing')}
              className="rounded-lg border border-white/15 bg-[#0E1117] px-5 py-2.5 text-sm font-medium text-[#F4F2ED] transition-colors hover:bg-white/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Pricing
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5 space-y-4">
          <p className="font-display text-base font-semibold tracking-tight text-[#F4F2ED]">
            NexoraAI.com
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            A spatial voice &amp; ambient 3D desktop companion for Windows 10 &amp; 11—engineered with reactive Core moods, structured memory, and local-first microphone privacy.
          </p>
          <p className="text-xs text-slate-500">
            Support · support@nexoraai.com · Windows 10 &amp; 11 (x64)
          </p>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Product</h3>
            <ul className="mt-3 space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/pricing')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Lifetime Gen 3
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/cloud')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Nexora Cloud
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/download')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Download
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Workspace</h3>
            <ul className="mt-3 space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/guide')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Setup Guide
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/account')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Account &amp; Devices
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/remote')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Nexora Remote
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/security')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Security Architecture
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Governance</h3>
            <ul className="mt-3 space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/privacy')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/terms')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  License Terms
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/refund')}
                  className="hover:text-[#F4F2ED] transition-colors cursor-pointer"
                >
                  Refund Policy
                </button>
              </li>
              <li>
                <a href="mailto:support@nexoraai.com" className="hover:text-[#F4F2ED] transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 NexoraAI.com. All rights reserved.</p>
          <p>Windows 10 &amp; 11 x64 · Generation 3</p>
        </div>
      </div>
    </footer>
  );
}
