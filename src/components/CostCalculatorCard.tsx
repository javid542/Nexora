import { Calculator, KeyRound, Server } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateCostComparison } from '../utils/stonicLogic';
import { CheckoutPlanType } from './CheckoutModal';

interface CostCalculatorCardProps {
  onOpenCheckout: (plan: CheckoutPlanType) => void;
}

export function CostCalculatorCard({ onOpenCheckout }: CostCalculatorCardProps) {
  const [dailyTurns, setDailyTurns] = useState(50);
  const [months, setMonths] = useState(12);
  const [depth, setDepth] = useState<'concise' | 'balanced' | 'deep'>('balanced');

  const estimate = useMemo(
    () => calculateCostComparison({ dailyTurns, months, depth }),
    [dailyTurns, months, depth]
  );

  return (
    <section
      aria-labelledby="cost-calc-heading"
      className="mt-10 rounded-xl border border-white/10 bg-[#0E1117] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-white/[0.08] pb-5">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-blue-400">
            <Calculator className="h-3.5 w-3.5" />
            <span>Interactive Cost Estimator</span>
          </p>
          <h2 id="cost-calc-heading" className="mt-1.5 font-display text-xl sm:text-2xl font-semibold text-[#F4F2ED]">
            Compare Nexora Cloud vs. Bring Your Own Key (BYOK)
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Slide your expected daily conversation volume to inspect exact 1-to-24 month ownership cost. Month 1 Cloud is $0 with Lifetime.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
          ~{estimate.monthlyTurns.toLocaleString()} turns/mo
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="calc-daily-turns" className="font-medium text-slate-300">
                Daily Voice &amp; Chat Turns
              </label>
              <span className="font-mono text-[#F4F2ED] tabular-nums">{dailyTurns} / day</span>
            </div>
            <input
              id="calc-daily-turns"
              type="range"
              min={10}
              max={300}
              step={5}
              value={dailyTurns}
              onChange={(e) => setDailyTurns(Number(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-500">
              <span>10 light</span>
              <span>100 Basic cap</span>
              <span>300 heavy</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="calc-horizon-months" className="font-medium text-slate-300">
                Ownership Horizon
              </label>
              <span className="font-mono text-[#F4F2ED] tabular-nums">
                {months} {months === 1 ? 'month' : 'months'}
              </span>
            </div>
            <input
              id="calc-horizon-months"
              type="range"
              min={1}
              max={24}
              step={1}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-500">
              <span>1 mo (Free Cloud)</span>
              <span>12 mo</span>
              <span>24 mo</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-300 mb-2">Typical Response Depth</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-white/10 bg-[#07080A] p-1">
              {(
                [
                  { id: 'concise', label: 'Concise' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'deep', label: 'Deep' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDepth(opt.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    depth === opt.id
                      ? 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Side-by-Side Financial Output */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#07080A] p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#F4F2ED]">
                  <Server className="h-3.5 w-3.5 text-blue-400" />
                  <span>Lifetime + Nexora Cloud</span>
                </span>
                <span className="font-mono uppercase text-blue-300">
                  {estimate.recommendedCloudTier}
                </span>
              </div>
              <p className="font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
                ${estimate.cloudTotalCost}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                $56 Lifetime + ${estimate.cloudMonthlyPrice}/mo after Month 1. Zero API keys or external billing setup.
              </p>
            </div>

            <div className="rounded-xl border border-blue-400/35 bg-[#0A0F1A] p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#F4F2ED]">
                  <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                  <span>Lifetime + BYOK</span>
                </span>
                <span className="font-mono text-amber-300 tabular-nums">
                  ~${estimate.byokMonthlyApiEstimate.toFixed(2)}/mo API
                </span>
              </div>
              <p className="font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
                ${estimate.byokTotalCost.toFixed(0)}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                $56 Lifetime + direct provider token billing with zero NexoraAI usage caps.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/10 bg-[#07080A] px-5 py-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-blue-400">
                Estimate Summary
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#F4F2ED]">{estimate.verdict}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckout('lifetime')}
              className="rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer whitespace-nowrap shrink-0"
            >
              Start with $56 Lifetime
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
