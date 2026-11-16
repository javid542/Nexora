import { MessageSquare, X } from 'lucide-react';
import { Testimonial } from '../data/stonicData';

interface ProofModalProps {
  testimonial: Testimonial | null;
  onClose: () => void;
}

export function ProofModal({ testimonial, onClose }: ProofModalProps) {
  if (!testimonial) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Verified proof from ${testimonial.author}`}
    >
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0B101B] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium text-blue-400">
              {testimonial.channel} · Verified Record
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-white">
              {testimonial.author} · {testimonial.subtitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proof modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#07080A] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              {testimonial.channel}
            </span>
            <span className="font-mono">{testimonial.time || 'Verified'}</span>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3.5 text-sm leading-relaxed text-slate-100">
            {testimonial.quote}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {testimonial.proofContext || 'Submitted directly by verified NexoraAI user.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 cursor-pointer"
        >
          Close Proof
        </button>
      </div>
    </div>
  );
}
