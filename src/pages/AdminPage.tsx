import { Check, Clock, Lock, ShieldCheck, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { PaymentSubmissionRecord, PaymentSubmissionStatus } from '../data/stonicData';
import { UserAccountDoc } from '../lib/firebase';
import { isAdminEmail } from '../utils/stonicLogic';
import { AppRoute } from '../components/Navbar';

interface AdminPageProps {
  authLoading: boolean;
  isSignedIn: boolean;
  userEmail: string;
  submissions: PaymentSubmissionRecord[];
  users: UserAccountDoc[];
  onSignInGoogle: () => Promise<void>;
  onReviewSubmission: (params: {
    submission: PaymentSubmissionRecord;
    decision: 'Approved' | 'Rejected';
    reviewerNote: string;
  }) => Promise<void>;
  onNavigate: (route: AppRoute) => void;
}

export function AdminPage({
  authLoading,
  isSignedIn,
  userEmail,
  submissions,
  users,
  onSignInGoogle,
  onReviewSubmission,
  onNavigate,
}: AdminPageProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentSubmissionStatus>('Pending');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const authorized = isSignedIn && isAdminEmail(userEmail);

  const handleGoogleAuth = async () => {
    setActionError(null);
    setSigningIn(true);
    try {
      await onSignInGoogle();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Google sign-in interrupted.');
    } finally {
      setSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#0E1117] p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-blue-400">
            NexoraAI Owner Verification
          </p>
          <p className="mt-3 text-sm text-slate-300">Verifying owner session...</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#0E1117] p-6 sm:p-8 text-center space-y-5">
          <Lock className="mx-auto h-6 w-6 text-blue-400" />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blue-400">
              Restricted Console · /admin
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-[#F4F2ED]">
              Owner Sign-In Required
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Authenticate with the verified owner Google account to inspect receipt submissions and activate customer licenses.
            </p>
          </div>

          {actionError && (
            <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {actionError}
            </p>
          )}

          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleGoogleAuth()}
            className="w-full rounded-lg bg-[#F4F2ED] px-5 py-3 text-sm font-semibold text-[#07080A] hover:bg-white cursor-pointer disabled:opacity-60"
          >
            {signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}
          </button>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-amber-500/30 bg-[#0E1117] p-6 sm:p-8 text-center space-y-4">
          <Lock className="mx-auto h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl font-semibold text-[#F4F2ED]">
            Owner Access Restricted
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Signed in as <span className="font-mono text-[#F4F2ED]">{userEmail}</span>. The NexoraAI verification console is locked strictly to the verified store owner account.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/account')}
            className="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer"
          >
            Return to Account Portal
          </button>
        </div>
      </main>
    );
  }

  const pendingCount = submissions.filter((s) => s.status === 'Pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const lifetimeUsersCount = users.filter((u) => u.hasLifetime).length;
  const filteredSubmissions =
    statusFilter === 'All'
      ? submissions
      : submissions.filter((s) => s.status === statusFilter);

  const handleDecision = async (
    sub: PaymentSubmissionRecord,
    decision: 'Approved' | 'Rejected'
  ) => {
    if (busyId) return;
    setActionError(null);
    setBusyId(sub.id);
    try {
      await onReviewSubmission({
        submission: sub,
        decision,
        reviewerNote: notesById[sub.id] || '',
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to complete verification action.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-blue-400">
            NexoraAI.com · Owner Verification Console
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#F4F2ED]">
            Settlement Queue &amp; License Governance
          </h1>
          <p className="mt-1 text-xs font-mono text-slate-400">
            Authenticated Admin · {userEmail}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/account')}
          className="self-start rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer"
        >
          Back to Account
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Queue</span>
            <Clock className="h-4 w-4 text-amber-300" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Approved Receipts</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Registered Accounts</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
            {users.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Lifetime Seats</span>
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#F4F2ED] tabular-nums">
            {lifetimeUsersCount}
          </p>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {actionError}
        </p>
      )}

      {/* Payment Verification Queue */}
      <section className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
              Manual Settlement Queue
            </h2>
            <p className="text-xs text-slate-400">
              Approving a ticket atomically activates the buyer&apos;s Firestore license &amp; creates an immutable receipt.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter submissions by status"
            className="inline-flex rounded-lg border border-white/10 bg-[#07080A] p-1 gap-1 self-start"
          >
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#07080A] p-8 text-center text-xs text-slate-400">
            No {statusFilter.toLowerCase()} manual payment submissions found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((sub) => {
              const isPending = sub.status === 'Pending';
              const isBusy = busyId === sub.id;
              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-white/10 bg-[#07080A] p-5 space-y-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-[#F4F2ED]">{sub.item}</span>
                        <span className="font-mono text-xs text-blue-300 tabular-nums">
                          {sub.amount}
                        </span>
                        <span
                          className={`font-mono text-[11px] uppercase ${
                            sub.status === 'Approved'
                              ? 'text-emerald-400'
                              : sub.status === 'Rejected'
                                ? 'text-red-300'
                                : 'text-amber-300'
                          }`}
                        >
                          · {sub.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400">
                        Buyer: <span className="text-slate-200">{sub.ownerEmail}</span> · Method:{' '}
                        {sub.method} · Date: {sub.submittedDate}
                      </p>
                      <p className="text-xs font-mono text-slate-300">
                        Reference ID:{' '}
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[#F4F2ED]">
                          {sub.referenceCode}
                        </span>
                      </p>
                    </div>

                    {isPending && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDecision(sub, 'Approved')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F4F2ED] px-3.5 py-2 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isBusy ? 'Processing...' : 'Approve & Activate'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDecision(sub, 'Rejected')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-red-200 hover:bg-red-500/15 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isPending ? (
                    <div>
                      <label htmlFor={`note-${sub.id}`} className="sr-only">
                        Reviewer note for {sub.ownerEmail}
                      </label>
                      <input
                        id={`note-${sub.id}`}
                        type="text"
                        maxLength={240}
                        value={notesById[sub.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        placeholder="Optional verification note (e.g. Verified JazzCash TID)"
                        className="w-full rounded-lg border border-white/10 bg-[#0E1117] px-3 py-2 text-xs text-[#F4F2ED] placeholder:text-slate-600 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  ) : (
                    sub.reviewerNote && (
                      <p className="text-xs text-slate-400 font-mono">
                        Reviewer Note: {sub.reviewerNote}
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer Account Directory */}
      <section className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-6">
        <h2 className="font-display text-lg font-semibold text-[#F4F2ED]">
          Customer Accounts ({users.length})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">User</th>
                <th className="py-2.5 pr-4 font-medium">Email</th>
                <th className="py-2.5 pr-4 font-medium">Lifetime</th>
                <th className="py-2.5 pr-4 font-medium">Cloud Plan</th>
                <th className="py-2.5 font-medium">PCs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08] text-slate-200">
              {users.map((u) => (
                <tr key={u.uid}>
                  <td className="py-3 pr-4 font-sans font-medium text-[#F4F2ED]">
                    {u.displayName}
                  </td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">
                    {u.hasLifetime ? (
                      <span className="text-emerald-400">Active</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-blue-300">{u.cloudPlan}</td>
                  <td className="py-3">{u.deviceCount} / 3</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
