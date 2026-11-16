import { Clock, Laptop, Lock, LogOut, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  CloudPlanId,
  DeviceSlot,
  PaymentSubmissionRecord,
  PurchaseRecord,
} from '../data/stonicData';
import {
  calculateCloudUsage,
  canActivateDevice,
  isAdminEmail,
  MAX_DEVICE_NAME_LENGTH,
  MAX_DEVICES,
} from '../utils/stonicLogic';
import { AppRoute } from '../components/Navbar';

interface AccountPageProps {
  authLoading: boolean;
  isSignedIn: boolean;
  displayName: string;
  userEmail: string;
  hasLifetime: boolean;
  cloudPlan: CloudPlanId;
  dailyUsed: number;
  monthlyUsed: number;
  devices: DeviceSlot[];
  purchases: PurchaseRecord[];
  submissions: PaymentSubmissionRecord[];
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRegisterDevice: (
    name: string,
    os: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
  onChangeCloudPlan: (plan: CloudPlanId) => Promise<void>;
  onNavigate: (route: AppRoute) => void;
}

export function AccountPage({
  authLoading,
  isSignedIn,
  displayName,
  userEmail,
  hasLifetime,
  cloudPlan,
  dailyUsed,
  monthlyUsed,
  devices,
  purchases,
  submissions,
  onSignInGoogle,
  onSignOut,
  onRegisterDevice,
  onRevokeDevice,
  onChangeCloudPlan,
  onNavigate,
}: AccountPageProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceOs, setNewDeviceOs] = useState('Windows 11 x64');
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);

  const usage = calculateCloudUsage(cloudPlan, dailyUsed, monthlyUsed);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await onSignInGoogle();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleDeviceAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (deviceBusy) return;
    setDeviceError(null);
    setDeviceBusy(true);
    try {
      const res = await onRegisterDevice(newDeviceName, newDeviceOs);
      if (!res.ok) {
        setDeviceError(res.error);
        return;
      }
      setNewDeviceName('');
    } catch (err) {
      setDeviceError(
        err instanceof Error ? err.message : 'Could not register device.'
      );
    } finally {
      setDeviceBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setDeviceError(null);
    try {
      await onRevokeDevice(id);
    } catch (err) {
      setDeviceError(
        err instanceof Error ? err.message : 'Could not revoke device slot.'
      );
    }
  };

  const handlePlanChange = async (planId: CloudPlanId) => {
    if (planBusy) return;
    setPlanBusy(true);
    try {
      await onChangeCloudPlan(planId);
    } finally {
      setPlanBusy(false);
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#0A0F1A] p-8 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
            Account Portal
          </p>
          <p className="mt-3 text-sm text-slate-300">Verifying session...</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#0A0F1A] p-6 sm:p-8 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
            Account Portal
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Your account</h1>
          <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
            Sign in with Google to sync your Generation 3 access, manage your 3 Windows PC slots, and view your purchase receipts.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              <span>{signingIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            {authError && (
              <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200 text-left">
                {authError}
              </p>
            )}
          </div>

          <p className="mt-5 text-xs text-slate-500 leading-relaxed">
            Use the same Google account you sign in with on the NexoraAI desktop app — your access and memories sync to that account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-mono text-blue-400">
            {displayName ? `${displayName} · Verified Google Account` : 'Signed in as'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-white">
            {userEmail}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {isAdminEmail(userEmail) && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Owner Console</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* License & Cloud Usage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Active Access</h2>
            <ShieldCheck className="h-5 w-5 text-blue-400" />
          </div>

          <div className="rounded-lg border border-white/10 bg-[#05070B] p-4 space-y-1">
            <p className="text-xs text-slate-400">Desktop License</p>
            <p className="text-sm font-semibold text-white">
              {hasLifetime ? 'Lifetime · Generation 3 (Active)' : 'No Lifetime License Yet'}
            </p>
            {!hasLifetime && (
              <button
                type="button"
                onClick={() => onNavigate('/pricing')}
                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Activate Lifetime ($56) →
              </button>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#05070B] p-4 space-y-2">
            <p className="text-xs text-slate-400">AI Engine Mode</p>
            <p className="text-sm font-semibold text-white">{usage.planLabel}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(
                [
                  { id: 'free-trial', label: 'Free Month' },
                  { id: 'basic', label: 'Basic ($19)' },
                  { id: 'power', label: 'Power ($49)' },
                  { id: 'byok', label: 'Own Key' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={planBusy}
                  onClick={() => void handlePlanChange(opt.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    cloudPlan === opt.id
                      ? 'bg-blue-600 text-white'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Nexora Cloud Quota</h2>
            <p className="mt-1 text-xs text-slate-400">
              Live balance shared across all your active Lifetime PCs.
            </p>

            {usage.unlimitedByok ? (
              <div className="mt-6 rounded-lg border border-white/10 bg-[#07080A] p-5">
                <p className="text-sm font-semibold text-white">Own API Key Mode Active</p>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  No daily or monthly limits from NexoraAI. Usage is billed directly by your AI provider inside the desktop app.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4 font-mono tabular-nums">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Daily Usage</span>
                    <span>
                      {usage.dailyUsed} / {usage.dailyLimit} units ({usage.dailyRemaining} left)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round((usage.dailyUsed / usage.dailyLimit) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Monthly Usage</span>
                    <span>
                      {usage.monthlyUsed} / {usage.monthlyLimit} units ({usage.monthlyRemaining} left)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all"
                      style={{ width: `${usage.percentUsed}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Need higher daily capacity? Switch between Basic and Power anytime on the{' '}
            <button
              type="button"
              onClick={() => onNavigate('/cloud')}
              className="underline text-slate-300 hover:text-white cursor-pointer"
            >
              Nexora Cloud page
            </button>
            .
          </p>
        </div>
      </div>

      {/* 3-Device Slot Manager */}
      <section className="rounded-xl border border-white/10 bg-[#0A0F1A] p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Registered Devices ({devices.length} / {MAX_DEVICES})
            </h2>
            <p className="text-xs text-slate-400">
              Lifetime covers up to 3 active Windows PCs simultaneously. Revoke an old machine to free a slot.
            </p>
          </div>
          <span className="font-mono text-xs text-blue-300 tabular-nums">
            {canActivateDevice(devices, MAX_DEVICES)
              ? `${MAX_DEVICES - devices.length} slot(s) available`
              : 'All 3 slots used'}
          </span>
        </div>

        <form onSubmit={handleDeviceAdd} className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="device-name-input" className="sr-only">
            New device name
          </label>
          <input
            id="device-name-input"
            type="text"
            maxLength={MAX_DEVICE_NAME_LENGTH}
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="e.g. Workstation-Home"
            className="flex-1 rounded-lg border border-white/15 bg-[#05070B] px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
          <label htmlFor="device-os-select" className="sr-only">
            Operating system
          </label>
          <select
            id="device-os-select"
            value={newDeviceOs}
            onChange={(e) => setNewDeviceOs(e.target.value)}
            className="rounded-lg border border-white/15 bg-[#05070B] px-3 py-2 text-xs text-slate-200 focus:border-blue-400 focus:outline-none"
          >
            <option value="Windows 11 x64">Windows 11 x64</option>
            <option value="Windows 10 x64">Windows 10 x64</option>
          </select>
          <button
            type="submit"
            disabled={deviceBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-blue-100 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{deviceBusy ? 'Registering...' : 'Register Device'}</span>
          </button>
        </form>

        {deviceError && (
          <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
            {deviceError}
          </p>
        )}

        {devices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#05070B] p-6 text-center text-xs text-slate-400">
            No Windows PCs registered yet. Add your first workstation above to bind your Generation 3 slot.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#05070B] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Laptop className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{dev.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{dev.os}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(dev.id)}
                    aria-label={`Revoke device ${dev.name}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-red-300 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-3 text-[11px] font-mono text-slate-500">
                  {dev.status} · {dev.lastActive}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual Payment Verification Queue */}
      {submissions.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-[#0A0F1A] p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Verification Queue
              </h2>
              <p className="text-xs text-slate-400">
                Manual settlement references submitted for owner verification.
              </p>
            </div>
            <Clock className="h-4 w-4 text-amber-300 shrink-0" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Item</th>
                  <th className="py-2.5 pr-4 font-medium">Amount</th>
                  <th className="py-2.5 pr-4 font-medium">Method</th>
                  <th className="py-2.5 pr-4 font-medium">Reference ID</th>
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-200">
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 pr-4 font-sans font-medium text-white">
                      <div>{sub.item}</div>
                      {sub.reviewerNote && (
                        <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                          Note: {sub.reviewerNote}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">{sub.amount}</td>
                    <td className="py-3 pr-4">{sub.method}</td>
                    <td className="py-3 pr-4 text-slate-300">{sub.referenceCode}</td>
                    <td className="py-3 pr-4 text-slate-400">{sub.submittedDate}</td>
                    <td
                      className={`py-3 font-semibold ${
                        sub.status === 'Approved'
                          ? 'text-emerald-400'
                          : sub.status === 'Rejected'
                            ? 'text-red-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {sub.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Purchase History */}
      <section className="rounded-xl border border-white/10 bg-[#0A0F1A] p-6">
        <h2 className="font-display text-lg font-semibold text-white">Purchase History</h2>
        {purchases.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">
            No purchases recorded yet. Activate Lifetime ($56) or a Nexora Cloud plan on Pricing.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Item</th>
                  <th className="py-2.5 pr-4 font-medium">Amount</th>
                  <th className="py-2.5 pr-4 font-medium">Method</th>
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-200">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4 font-sans font-medium text-white">{p.item}</td>
                    <td className="py-3 pr-4">{p.amount}</td>
                    <td className="py-3 pr-4">{p.method}</td>
                    <td className="py-3 pr-4 text-slate-400">{p.date}</td>
                    <td className="py-3 text-blue-300">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
