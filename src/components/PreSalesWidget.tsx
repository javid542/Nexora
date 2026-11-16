import { HelpCircle, Send, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_QUESTIONS = [
  'Do I need my own API key?',
  'How does mic privacy work?',
  'How many PCs does Lifetime cover?',
];

export function PreSalesWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<QAMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: 'Ask anything about Windows requirements, Lifetime vs. Nexora Cloud, BYOK privacy, or Nexora Remote.',
    },
  ]);

  async function askQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/presales/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach pre-sales assistant.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.answer || 'Feel free to review the Pricing and FAQ sections for full details.',
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    askQuestion(input);
  };

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50">
      {open ? (
        <div
          role="dialog"
          aria-label="Pre-purchase assistant"
          className="w-[min(360px,calc(100vw-2rem))] rounded-xl border border-white/15 bg-[#0B101B] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">Ask NexoraAI</h3>
              <p className="text-xs text-slate-400">Questions before you buy</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close pre-sales helper"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-6 bg-blue-600 text-white'
                    : 'mr-4 border border-white/10 bg-white/5 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="mr-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                Checking details...
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2.5 flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => askQuestion(q)}
                disabled={loading}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
            <label htmlFor="presales-input" className="sr-only">
              Ask a question before buying
            </label>
            <input
              id="presales-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Windows, Cloud, or keys..."
              className="flex-1 rounded-lg border border-white/10 bg-[#05070B] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send pre-sales question"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0B101B] px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-medium text-white shadow-lg transition-colors hover:border-blue-400/50 hover:bg-[#111827] cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-blue-400" />
          <span className="whitespace-nowrap">Ask NexoraAI</span>
        </button>
      )}
    </div>
  );
}
