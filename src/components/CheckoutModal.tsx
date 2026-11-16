import { Check, Clock, CreditCard, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { CloudPlanId } from '../data/stonicData';
import {
  buildPurchaseSummary,
  MAX_RECEIPT_REF_LENGTH,
  requiresManualVerification,
  sanitizeReceiptReference,
} from '../utils/stonicLogic';

export type CheckoutPlanType = 'lifetime' | 'basic' | 'power';

interface CheckoutModalProps {
  plan: CheckoutPlanType | null;
  isSignedIn: boolean;
  userEmail: string;
  onSignInWithGoogle: () => Promise<void>;
  onClose: () => void;
  onCompletePurchase: (payload: {
    plan: CheckoutPlanType;
    email: string;
    method: string;
    cloudPlanAfter: CloudPlanId;
    referenceCode?: string;
  }) => Promise<{ pendingVerification?: boolean }>;
}

const PAYMENT_METHODS = [
  { id: 'Card', label: 'Credit / Debit Card', note: 'Instant activation' },
  { id: 'Bank Transfer', label: 'Bank Transfer', note: 'Owner verified via TXID' },
  { id: 'JazzCash', label: 'JazzCash', note: 'Verified via TID' },
  { id: 'USDT / Binance Pay', label: 'USDT / Binance Pay', note: 'Verified via Order ID' },
];

export function CheckoutModal({
  plan,
  isSignedIn,
  userEmail,
  onSignInWithGoogle,
  onClose,
  onCompletePurchase,
}: CheckoutModalProps) {
  const [method, setMethod] = useState('Card');
  const [referenceCode, setReferenceCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completionMode, setCompletionMode] = useState<'active' | 'pending' | null>(null);

  useEffect(() => {
    setCompletionMode(null);
    setErrorMsg(null);
    setReferenceCode('');
    setMethod('Card');
  }, [plan]);

  if (!plan) return null;

  const isManual = requiresManualVerification(method);
  const summaryInfo = buildPurchaseSummary(plan);
  const details =
    plan === 'lifetime'
      ? {
          title: 'NexoraAI · Lifetime Gen 3',
          price: '$56',
          cadence: 'one-time',
          summary: 'Yours for life on up to 3 Windows PCs · Includes 1st month Nexora Cloud free.',
          cloudPlanAfter: summaryInfo.cloudPlanAfter,
        }
      : plan === 'basic'
        ? {
            title: 'Nexora Cloud · Basic',
            price: '$19',
            cadence: '/month',
            summary: 'Managed fast & deep AI models across all 3 Lifetime PCs. Cancel anytime.',
            cloudPlanAfter: summaryInfo.cloudPlanAfter,
          }
        : {
            title: 'Nexora Cloud · Power',
            price: '$49',
            cadence: '/month',
            summary: 'About 3.5x daily & monthly usage of Basic plus priority queue.',
            cloudPlanAfter: summaryInfo.cloudPlanAfter,
          };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await onSignInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was interrupted.';
      setErrorMsg(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !userEmail) {
      setErrorMsg('Please sign in with Google first to bind your license.');
      return;
    }

    let validatedRef: string | undefined;
    if (isManual) {
      const refCheck = sanitizeReceiptReference(referenceCode);
      if (!refCheck.ok) {
        setErrorMsg(refCheck.error);
        return;
      }
      validatedRef = refCheck.referenceCode;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await onCompletePurchase({
        plan,
        email: userEmail,
        method,
        cloudPlanAfter: details.cloudPlanAfter,
        referenceCode: validatedRef,
      });
      setCompletionMode(res?.pendingVerification ? 'pending' : 'active');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not record checkout in Cloud Firestore.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout for ${details.title}`}
    >
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0B101B] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium text-blue-400">Generation 3 Activation</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">{details.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {completionMode === 'pending' ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4">
              <Clock className="h-5 w-5 text-amber-300 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Submitted for Verification</p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Reference <span className="font-mono text-white">{referenceCode}</span> queued for{' '}
                  <span className="font-mono text-white">{userEmail}</span> via {method}.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can track live verification status inside your Account portal. Once approved by the NexoraAI team, your license and receipt activate automatically.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-[#F4F2ED] px-4 py-2.5 text-sm font-semibold text-[#07080A] hover:bg-white cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : completionMode === 'active' ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <Check className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">License Saved to Your Account</p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Activated on <span className="font-mono text-white">{userEmail}</span> via {method}.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your entitlement and immutable purchase receipt are synced in Cloud Firestore. Open the Account portal anytime to register your 3 Windows PCs.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-100 cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="flex items-baseline justify-between rounded-lg border border-white/10 bg-[#05070B] px-4 py-3">
              <span className="text-xs text-slate-400">{details.summary}</span>
              <span className="ml-4 shrink-0 font-display text-2xl font-bold text-white tabular-nums">
                {details.price}
                <span className="text-xs font-normal text-slate-400"> {details.cadence}</span>
              </span>
            </div>

            {isSignedIn ? (
              <div className="rounded-lg border border-white/10 bg-[#05070B] px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-slate-400">
                  Verified Google Account (used in NexoraAI Desktop)
                </p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-white">{userEmail}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 space-y-3">
                <p className="text-xs text-slate-200 leading-relaxed">
                  Sign in with your Google account so your Generation 3 license and 3 PC slots persist across devices.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={signingIn}
                  className="w-full rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-blue-100 cursor-pointer disabled:opacity-60"
                >
                  {signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Payment Method</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const selected = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setMethod(pm.id);
                        setErrorMsg(null);
                      }}
                      className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-blue-400 bg-blue-500/15 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                        {pm.label}
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-400">{pm.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isManual && (
              <div className="rounded-lg border border-white/10 bg-[#05070B] p-3.5 space-y-2">
                <label htmlFor="checkout-ref-input" className="block text-xs font-medium text-slate-200">
                  Transaction / Receipt Reference ID
                </label>
                <input
                  id="checkout-ref-input"
                  type="text"
                  maxLength={MAX_RECEIPT_REF_LENGTH}
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="e.g. JC-TID-892411 or Binance Order #49210"
                  className="w-full rounded-lg border border-white/15 bg-[#07080A] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-blue-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Manual settlements enter our verification queue and activate upon receipt confirmation.
                </p>
              </div>
            )}

            {errorMsg && (
              <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              <span>Persists directly to your Cloud Firestore account ledger.</span>
            </div>

            <button
              type="submit"
              disabled={!isSignedIn || submitting}
              className="w-full rounded-lg bg-[#F4F2ED] px-4 py-2.5 text-sm font-semibold text-[#07080A] transition-colors hover:bg-white cursor-pointer disabled:opacity-40"
            >
              {submitting
                ? isManual
                  ? 'Submitting Receipt...'
                  : 'Activating License...'
                : isManual
                  ? `Submit ${details.price} Verification`
                  : `Activate ${details.price} ${details.cadence}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

