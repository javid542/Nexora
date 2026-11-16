import { ArrowLeft, Check, KeyRound, Server } from 'lucide-react';
import { CheckoutPlanType } from '../components/CheckoutModal';
import { CostCalculatorCard } from '../components/CostCalculatorCard';
import { FaqSection } from '../components/FaqSection';
import { AppRoute } from '../components/Navbar';

interface PricingPageProps {
  mode: 'pricing' | 'cloud';
  onNavigate: (route: AppRoute) => void;
  onOpenCheckout: (plan: CheckoutPlanType) => void;
}

export function PricingPage({ mode, onNavigate, onOpenCheckout }: PricingPageProps) {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {mode === 'cloud' && (
          <button
            type="button"
            onClick={() => onNavigate('/pricing')}
            className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Pricing</span>
          </button>
        )}

        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
            {mode === 'cloud'
              ? 'Monthly Subscription · Cancel Anytime'
              : 'NexoraAI · Generation 3'}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#F4F2ED] text-balance">
            {mode === 'cloud' ? 'Monthly plans. No API keys.' : 'Own it for lifetime.'}
          </h1>
          <p className="mt-3 text-base text-slate-400 leading-relaxed">
            {mode === 'cloud'
              ? 'Nexora Cloud runs the AI models on our managed infrastructure so you never need to configure or monitor an external API key.'
              : 'Pay once for the Windows desktop companion across up to 3 PCs. Bring your own API keys (BYOK), or add Nexora Cloud monthly.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-8 inline-flex rounded-lg border border-white/10 bg-[#0A0F1A] p-1 gap-1">
          <button
            type="button"
            onClick={() => onNavigate('/pricing')}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'pricing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Lifetime License ($56)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/cloud')}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'cloud' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Nexora Cloud ($19 / $49 mo)
          </button>
        </div>

        {mode === 'pricing' ? (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-blue-400/40 bg-[#0A0F1A] p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-white">
                    Lifetime · Gen 3
                  </h2>
                  <span className="text-xs font-mono text-blue-300">Best Value</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold text-white tabular-nums">$56</span>
                  <span className="text-sm text-slate-400">one-time payment</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  No recurring fee required for the app. Yours for life on up to 3 PCs.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-6 text-sm text-slate-300">
                  <ul className="space-y-2.5">
                    <li className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      What you get
                    </li>
                    {[
                      'All future Gen 3 updates included',
                      'Your own API keys — zero limits from us',
                      'First month of Nexora Cloud free ($19 value)',
                      'Up to 3 active Windows PCs',
                    ].map((txt) => (
                      <li key={txt} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-2.5">
                    <li className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Support &amp; Trust
                    </li>
                    {[
                      'Member release announcements',
                      'Direct email & ticket support',
                      'SHA-256 verified Windows installer',
                    ].map((txt) => (
                      <li key={txt} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                        <span>{txt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenCheckout('lifetime')}
                className="mt-8 w-full sm:w-auto rounded-lg bg-[#F4F2ED] px-6 py-3 text-sm font-semibold text-[#07080A] hover:bg-white transition-colors cursor-pointer"
              >
                Get Lifetime — $56
              </button>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0E1117] p-6 sm:p-8">
              <div>
                <p className="text-xs font-mono text-blue-400">Optional Add-On</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-white">Nexora Cloud</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  First month included free with Lifetime. Continue on Basic ($19/mo) or Power ($49/mo), or switch to your own API keys anytime.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/cloud')}
                  className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  Explore Cloud Plans
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/guide')}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Read BYO API Key Guide
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
            {/* Cloud Basic */}
            <div className="flex flex-col justify-between rounded-xl border border-white/15 bg-[#0E1117] p-6 sm:p-8">
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">Basic</h2>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold text-white tabular-nums">$19</span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Everything NexoraAI does, for everyday focus and voice.</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300 border-t border-white/10 pt-5">
                  {[
                    'Voice, chat, Memory, Skills & World Monitor',
                    'Fast everyday model + deeper reasoning model',
                    'Base daily and monthly usage (1×)',
                    'No API key or external billing setup required',
                    'Works simultaneously on all 3 Lifetime PCs',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onOpenCheckout('basic')}
                className="mt-8 w-full rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Get Basic — $19/mo
              </button>
            </div>

            {/* Cloud Power */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-400/40 bg-[#0A0F1A] p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-white">Power</h2>
                  <span className="text-xs font-mono text-blue-300">3.5× Usage</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold text-white tabular-nums">$49</span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  For people who live in the app and talk continuously throughout the day.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300 border-t border-white/10 pt-5">
                  {[
                    'Everything included in Basic',
                    'About 3.5× the daily and monthly usage of Basic',
                    'Live remaining balance visible inside Settings',
                    'Priority WhatsApp support from our team',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onOpenCheckout('power')}
                className="mt-8 w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Get Power — $49/mo
              </button>
            </div>
          </div>
        )}

        {/* Interactive BYOK vs Nexora Cloud Cost Calculator */}
        <CostCalculatorCard onOpenCheckout={onOpenCheckout} />

        {/* How It Works: One App, Two Ways to Power It */}
        <div className="mt-12 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-blue-400">How It Works</p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-white">
              One app. Two ways to power it.
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The desktop app is what you own ($56 Lifetime). The AI engine is what lets your character think and talk — you choose who runs it.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#07080A] p-5">
              <div className="flex items-center gap-2.5 text-white font-semibold">
                <Server className="h-4 w-4 text-blue-400" />
                <span>Option A · Nexora Cloud</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                We host and manage the AI inference for you. First month free with Lifetime, then $19 or $49/mo. Zero API key setup.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07080A] p-5">
              <div className="flex items-center gap-2.5 text-white font-semibold">
                <KeyRound className="h-4 w-4 text-blue-400" />
                <span>Option B · Your Own API Key (BYOK)</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Connect your personal provider key directly inside desktop Settings. Your provider bills you for exact usage with zero limits from NexoraAI.
              </p>
            </div>
          </div>

          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-white/10 pt-6">
            <li className="text-sm">
              <span className="font-mono text-xs text-blue-400">01.</span>
              <p className="mt-1 font-semibold text-white">Get Lifetime</p>
              <p className="mt-0.5 text-xs text-slate-400">Pay $56 once. The app is yours across 3 PCs.</p>
            </li>
            <li className="text-sm">
              <span className="font-mono text-xs text-blue-400">02.</span>
              <p className="mt-1 font-semibold text-white">First month on Nexora Cloud</p>
              <p className="mt-0.5 text-xs text-slate-400">Included free. Talk right away with nothing to configure.</p>
            </li>
            <li className="text-sm">
              <span className="font-mono text-xs text-blue-400">03.</span>
              <p className="mt-1 font-semibold text-white">Choose how to continue</p>
              <p className="mt-0.5 text-xs text-slate-400">Stay on Cloud monthly or paste your own API key anytime.</p>
            </li>
          </ol>
        </div>
      </section>

      <FaqSection />
    </main>
  );
}
