import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export type AppRoute =
  | '/'
  | '/pricing'
  | '/cloud'
  | '/download'
  | '/guide'
  | '/account'
  | '/admin'
  | '/remote'
  | '/security'
  | '/terms'
  | '/refund'
  | '/privacy';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isSignedIn: boolean;
}

const NAV_LINKS: Array<{ label: string; route: AppRoute }> = [
  { label: 'Overview', route: '/' },
  { label: 'Pricing', route: '/pricing' },
  { label: 'Security', route: '/security' },
  { label: 'Download', route: '/download' },
  { label: 'Account', route: '/account' },
];

export function Navbar({ currentRoute, onNavigate, isSignedIn }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (route: AppRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080A]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="font-display text-base font-semibold tracking-tight text-[#F4F2ED] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
        >
          NexoraAI.com
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((item) => {
            const active =
              currentRoute === item.route ||
              (item.route === '/pricing' && currentRoute === '/cloud') ||
              (item.route === '/security' &&
                (currentRoute === '/terms' ||
                  currentRoute === '/refund' ||
                  currentRoute === '/privacy'));
            return (
              <a
                key={item.route}
                href={item.route}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.route);
                }}
                aria-current={active ? 'page' : undefined}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm ${
                  active
                    ? 'text-[#F4F2ED] border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-[#F4F2ED] hover:border-white/30'
                }`}
              >
                {item.label === 'Account' && isSignedIn ? 'Account' : item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLink('/download')}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] transition-colors hover:bg-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Get Started
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 md:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0E1117] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {NAV_LINKS.map((item) => {
              const active = currentRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.route}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLink(item.route);
                  }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? 'bg-blue-500/15 text-[#F4F2ED] border border-blue-400/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => handleLink('/download')}
              className="mt-2 w-full rounded-lg bg-[#F4F2ED] px-4 py-2.5 text-sm font-semibold text-[#07080A] cursor-pointer"
            >
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
