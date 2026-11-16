import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { FAQ_ITEMS, FaqItem } from '../data/stonicData';
import { filterFaqItems } from '../utils/stonicLogic';

const CATEGORIES: Array<FaqItem['category'] | 'All'> = [
  'All',
  'About NexoraAI',
  'Lifetime & Cloud',
  'Privacy, Security & Billing',
];

export function FaqSection() {
  const [selectedCategory, setSelectedCategory] = useState<FaqItem['category'] | 'All'>('All');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id);

  const items = filterFaqItems(FAQ_ITEMS, selectedCategory, query);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto max-w-4xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
    >
      <div className="text-center max-w-xl mx-auto">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400">FAQ</p>
        <h2
          id="faq-heading"
          className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
        >
          Common Questions
        </h2>
        <p className="mt-2.5 text-sm sm:text-base text-slate-400">
          Everything to know about Lifetime licensing, Nexora Cloud, BYOK privacy, and Windows compatibility.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter FAQ by category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 bg-[#0A0F1A] text-slate-300 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <label htmlFor="faq-search" className="sr-only">
            Search common questions
          </label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-lg border border-white/10 bg-[#0A0F1A] py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0A0F1A] p-6 text-center text-sm text-slate-400">
            No matching questions found. Try clearing your search filter.
          </div>
        ) : (
          items.map((item) => {
            const expanded = openId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#0A0F1A] overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? '' : item.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div>
                    <span className="block text-[11px] font-mono text-blue-400">
                      {item.category}
                    </span>
                    <span className="mt-0.5 block text-sm sm:text-base font-medium text-white">
                      {item.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      expanded ? 'rotate-180 text-blue-400' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-slate-300">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
