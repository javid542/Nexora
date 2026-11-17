import {
  CheckCircle2,
  FilePlus2,
  FolderCheck,
  FolderLock,
  FolderOpen,
  Lock,
  PauseCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Undo2,
  Unplug,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  AUTONOMY_TIERS,
  ActionLedgerEntry,
  ActionLedgerStatus,
  AutonomyTier,
  BUSINESS_PLAYBOOKS,
  BusinessPlaybook,
  FolderPermission,
} from '../data/stonicData';
import { formatBytesCompact, ScannedLocalFile } from '../utils/localFolderEngine';
import { summarizeOperatorMetrics } from '../utils/stonicLogic';
import { PWAInstallButton } from './PWAInstallButton';

export interface LocalFolderControlProps {
  supported: boolean;
  isConnected: boolean;
  folderName: string;
  files: ScannedLocalFile[];
  busy: boolean;
  errorMessage: string | null;
  lastScannedAt: string | null;
  onConnect: () => Promise<{ ok: boolean; folderName?: string; message: string }>;
  onDisconnect: () => void;
  onRescan: () => Promise<boolean>;
  onSeedSampleFiles: () => Promise<{ ok: boolean; message: string }>;
}

interface BusinessOperatorSectionProps {
  pcPaused: boolean;
  onTogglePcPaused: () => void;
  autonomyTier: AutonomyTier;
  onChangeAutonomyTier: (tier: AutonomyTier) => void;
  folders: FolderPermission[];
  onToggleFolder: (folderId: string) => void;
  ledgerEntries: ActionLedgerEntry[];
  onRunPlaybook: (playbook: BusinessPlaybook) => { ok: boolean; reason: string };
  onApproveEntry: (entryId: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onRejectEntry: (entryId: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onRevertEntry: (entryId: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onResetOperatorDemo: () => void;
  onOpenRemoteApprovals: () => void;
  localFolder: LocalFolderControlProps;
}

type LedgerFilter = 'All' | ActionLedgerStatus;

export function BusinessOperatorSection({
  pcPaused,
  onTogglePcPaused,
  autonomyTier,
  onChangeAutonomyTier,
  folders,
  onToggleFolder,
  ledgerEntries,
  onRunPlaybook,
  onApproveEntry,
  onRejectEntry,
  onRevertEntry,
  onResetOperatorDemo,
  onOpenRemoteApprovals,
  localFolder,
}: BusinessOperatorSectionProps) {
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('All');
  const [feedback, setFeedback] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  const activeTierConfig = AUTONOMY_TIERS.find((t) => t.id === autonomyTier) || AUTONOMY_TIERS[1];
  const metrics = summarizeOperatorMetrics(ledgerEntries, folders);
  const pendingEntries = ledgerEntries.filter((e) => e.status === 'Pending Approval');
  const filteredLedger =
    ledgerFilter === 'All'
      ? ledgerEntries
      : ledgerEntries.filter((e) => e.status === ledgerFilter);

  const handleRun = (pb: BusinessPlaybook) => {
    const res = onRunPlaybook(pb);
    setFeedback({
      tone: res.ok ? 'info' : 'warn',
      text: `${pb.title}: ${res.reason}`,
    });
  };

  const handleApprove = async (entryId: string) => {
    setBusyEntryId(entryId);
    try {
      const res = await onApproveEntry(entryId);
      if (!res.ok && res.error) {
        setFeedback({ tone: 'warn', text: res.error });
      } else {
        setFeedback({
          tone: 'info',
          text: localFolder.isConnected
            ? 'Action approved and applied inside connected Windows folder.'
            : 'Action approved and executed inside scoped folder.',
        });
      }
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleReject = async (entryId: string) => {
    setBusyEntryId(entryId);
    try {
      const res = await onRejectEntry(entryId);
      if (!res.ok && res.error) {
        setFeedback({ tone: 'warn', text: res.error });
      } else {
        setFeedback({ tone: 'info', text: 'Staged action rejected. No PC files were changed.' });
      }
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleRevert = async (entryId: string) => {
    setBusyEntryId(entryId);
    try {
      const res = await onRevertEntry(entryId);
      if (!res.ok && res.error) {
        setFeedback({ tone: 'warn', text: res.error });
      } else {
        setFeedback({ tone: 'info', text: 'Action reverted cleanly via rollback snapshot.' });
      }
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleToggleLock = () => {
    setFeedback(
      pcPaused
        ? { tone: 'info', text: 'PC automation resumed. Whitelisted folders and approvals are active.' }
        : null
    );
    onTogglePcPaused();
  };

  const handleConnectFolder = async () => {
    const res = await localFolder.onConnect();
    setFeedback({ tone: res.ok ? 'info' : 'warn', text: res.message });
  };

  const handleSeedSamples = async () => {
    if (pcPaused) {
      setFeedback({
        tone: 'warn',
        text: 'Emergency Kill Switch is active. Resume PC access before creating sample files.',
      });
      return;
    }
    const res = await localFolder.onSeedSampleFiles();
    setFeedback({ tone: res.ok ? 'info' : 'warn', text: res.message });
  };

  const statusTextClass = (status: ActionLedgerStatus) => {
    if (status === 'Pending Approval') return 'text-amber-300';
    if (status === 'Executed') return 'text-emerald-300';
    if (status === 'Rejected') return 'text-red-300';
    return 'text-slate-400';
  };

  return (
    <section
      id="operator"
      aria-labelledby="business-operator-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/[0.08]"
    >
      {/* Header + Emergency Kill Switch */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
            PC Business Operator · Safety Sandbox &amp; Real Folder Bridge
          </p>
          <h2
            id="business-operator-heading"
            className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2ED]"
          >
            Delegate PC work without losing control.
          </h2>
          <p className="mt-3 text-base text-slate-400 leading-relaxed">
            Set strict folder boundaries, choose how much autonomy NexoraAI has on Windows, connect a real local folder in Chrome or Edge, and undo any action in one click.
          </p>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 self-start lg:self-end shrink-0">
          <PWAInstallButton variant="compact" showManualDesktopFallback />

          <button
            type="button"
            onClick={handleToggleLock}
            aria-pressed={pcPaused}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              pcPaused
                ? 'border-red-400/50 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                : 'border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
            }`}
          >
            {pcPaused ? (
              <>
                <Play className="h-3.5 w-3.5 text-red-200" />
                <span>Resume PC Access</span>
              </>
            ) : (
              <>
                <PauseCircle className="h-3.5 w-3.5 text-amber-300" />
                <span>Pause PC Access</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenRemoteApprovals}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-white/15 bg-[#0E1117] px-4 py-2 text-xs font-medium text-[#F4F2ED] hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
            <span>Mobile Approvals ({metrics.pendingCount})</span>
          </button>
        </div>
      </div>

      {/* Control Strip: Kill Switch State + Autonomy Tier + Live Tabular Counters */}
      <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0E1117] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-300">Autonomy Tier</p>
            <div
              role="group"
              aria-label="PC Autonomy Tier"
              className="mt-2 inline-flex flex-wrap rounded-lg border border-white/10 bg-[#07080A] p-1 gap-1"
            >
              {AUTONOMY_TIERS.map((tier) => {
                const selected = autonomyTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChangeAutonomyTier(tier.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? tier.id === 'auto-pilot'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          : 'bg-[#F4F2ED] text-[#07080A] font-semibold'
                        : 'text-slate-400 hover:text-[#F4F2ED] border border-transparent'
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono tabular-nums border-t border-white/[0.06] pt-3 lg:border-t-0 lg:pt-0">
            <span className={pcPaused ? 'text-red-300 font-semibold' : 'text-emerald-300 font-semibold'}>
              {pcPaused ? 'PC Lock: PAUSED' : 'PC Lock: Active'}
            </span>
            <span className="text-slate-400">
              Pending: <strong className="text-[#F4F2ED]">{metrics.pendingCount}</strong>
            </span>
            <span className="text-slate-400">
              Executed: <strong className="text-[#F4F2ED]">{metrics.executedCount}</strong>
            </span>
            <span className="text-slate-400">
              Reverted: <strong className="text-[#F4F2ED]">{metrics.revertedCount}</strong>
            </span>
            <span className="text-slate-400">
              Folders: <strong className="text-[#F4F2ED]">{metrics.enabledFolderCount}/{folders.length}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 border-t border-white/[0.06] pt-3">
          <span className="font-mono text-slate-200">{activeTierConfig.shortLabel}</span> — {activeTierConfig.description}
        </p>

        {pcPaused && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-400/35 bg-red-500/10 px-4 py-2.5 text-xs text-red-200"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Emergency Kill Switch engaged: all local file writes, playbook runs, and remote approvals are paused.
              </span>
            </span>
            <button
              type="button"
              onClick={handleToggleLock}
              className="font-semibold text-white underline underline-offset-4 hover:text-red-100 cursor-pointer whitespace-nowrap"
            >
              Unlock PC Automation
            </button>
          </div>
        )}

        {feedback && !pcPaused && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-2.5 text-xs ${
              feedback.tone === 'warn'
                ? 'border-amber-400/35 bg-amber-500/10 text-amber-200'
                : 'border-blue-400/30 bg-blue-500/10 text-blue-100'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Live Windows Folder Bridge (Chrome / Edge File System Access API) */}
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0E1117] p-4 sm:p-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="font-display text-sm font-semibold text-[#F4F2ED]">
                Real Windows Folder Bridge
              </h3>
              <span className="font-mono text-[11px] text-slate-400">
                {localFolder.isConnected
                  ? `· Connected: ${localFolder.folderName} (${localFolder.files.length} items${localFolder.lastScannedAt ? ` · Scanned ${localFolder.lastScannedAt}` : ''})`
                  : localFolder.supported
                    ? '· Sandbox Mode (no local folder connected yet)'
                    : '· Browser File System Access requires desktop Chrome or Edge'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {localFolder.isConnected
                ? 'Playbooks below now inspect real files inside this Windows folder, stage real plans, and keep rollback snapshots for 1-click Undo.'
                : 'Connect one real folder on your PC (e.g. Desktop/Nexora-Test) so playbooks create, sort, and roll back real files on disk.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!localFolder.isConnected ? (
              <button
                type="button"
                disabled={localFolder.busy}
                onClick={() => void handleConnectFolder()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>{localFolder.busy ? 'Connecting...' : 'Connect Local Folder'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={localFolder.busy || pcPaused}
                  onClick={() => void handleSeedSamples()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-400/35 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 hover:bg-blue-500/20 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  <span>Seed 3 Sample Files</span>
                </button>
                <button
                  type="button"
                  disabled={localFolder.busy}
                  onClick={() => void localFolder.onRescan()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#07080A] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Rescan</span>
                </button>
                <button
                  type="button"
                  disabled={localFolder.busy}
                  onClick={localFolder.onDisconnect}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#07080A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>
        </div>

        {localFolder.errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200"
          >
            {localFolder.errorMessage}
          </div>
        )}

        {localFolder.isConnected && (
          <div className="border-t border-white/[0.06] pt-3">
            {localFolder.files.length === 0 ? (
              <p className="text-xs text-slate-400">
                Connected folder &ldquo;{localFolder.folderName}&rdquo; is empty. Click <strong className="text-white">Seed 3 Sample Files</strong> above or drop your own test documents inside Windows Explorer and click <strong className="text-white">Rescan</strong>.
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
                {localFolder.files.slice(0, 18).map((file) => (
                  <div
                    key={`${file.kind}-${file.name}`}
                    className="flex items-center justify-between gap-2 py-1 border-b border-white/[0.04]"
                  >
                    <span className="truncate text-slate-200">
                      {file.kind === 'directory' ? `[Dir] ${file.name}` : file.name}
                    </span>
                    <span className="text-slate-500 shrink-0">
                      {file.kind === 'directory' ? 'folder' : formatBytesCompact(file.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Business Playbooks + Scoped Folder Allowlist */}
        <div className="lg:col-span-5 space-y-6">
          {/* Business Playbooks */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F4F2ED]">
                  Business Playbooks
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Run a workflow to inspect how permissions and approvals trigger.
                </p>
              </div>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                {BUSINESS_PLAYBOOKS.length} SOPs
              </span>
            </div>

            <div className="space-y-3">
              {BUSINESS_PLAYBOOKS.map((pb) => {
                const targetFolder = folders.find((f) => f.id === pb.targetFolderId);
                const folderEnabled = Boolean(targetFolder?.enabled && !targetFolder?.locked);
                return (
                  <div
                    key={pb.id}
                    className="rounded-lg border border-white/[0.08] bg-[#07080A] p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F4F2ED]">{pb.title}</p>
                        <p className="mt-0.5 text-[11px] font-mono text-slate-400 tabular-nums">
                          {pb.department} · {pb.scheduleHint} · ~{pb.estimatedMinutesSaved}m saved
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRun(pb)}
                        className="rounded-md bg-[#F4F2ED] px-3 py-1.5 text-xs font-semibold text-[#07080A] hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Run Playbook
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{pb.summary}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono border-t border-white/[0.05]">
                      <span className="truncate text-slate-400">{targetFolder?.path}</span>
                      <span className={folderEnabled ? 'text-blue-300' : 'text-amber-300'}>
                        {folderEnabled ? 'Allowed' : 'Folder Blocked'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scoped Folder Allowlist */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F4F2ED]">
                Scoped Folder Allowlist
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Deny-by-default access. Toggle folders on or off to constrain where NexoraAI can act.
              </p>
            </div>

            <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {folders.map((folder) => {
                const isLocked = Boolean(folder.locked || folder.access === 'blocked');
                return (
                  <li key={folder.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <FolderLock className="h-4 w-4 text-red-400 shrink-0" />
                        ) : (
                          <FolderCheck
                            className={`h-4 w-4 shrink-0 ${
                              folder.enabled ? 'text-blue-400' : 'text-slate-500'
                            }`}
                          />
                        )}
                        <p className="text-xs font-semibold text-[#F4F2ED] truncate">{folder.label}</p>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
                        {folder.path} · {folder.access}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{folder.scopeNote}</p>
                    </div>

                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-300 shrink-0">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-pressed={folder.enabled}
                        aria-label={`Toggle ${folder.label} access`}
                        onClick={() => onToggleFolder(folder.id)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${
                          folder.enabled
                            ? 'border-blue-400/40 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
                            : 'border-white/15 bg-[#07080A] text-slate-400 hover:text-white'
                        }`}
                      >
                        {folder.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Column: Pending Approval Queue + Verifiable Action Ledger */}
        <div className="lg:col-span-7 space-y-6">
          {/* Approval Queue */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F4F2ED]">
                  Approval Queue
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Staged actions wait here until confirmed on your workstation or paired phone.
                </p>
              </div>
              <span className="font-mono text-xs text-amber-300 tabular-nums">
                {pendingEntries.length} pending
              </span>
            </div>

            {pendingEntries.length === 0 ? (
              <div className="rounded-lg border border-white/[0.08] bg-[#07080A] p-5 text-center space-y-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400 mx-auto" />
                <p className="text-xs font-medium text-[#F4F2ED]">Approval queue clear</p>
                <p className="text-xs text-slate-400">
                  Run any playbook on the left to preview a staged human-in-the-loop confirmation card.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-amber-400/30 bg-[#07080A] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono text-amber-300 tabular-nums">
                          Pending Approval · {entry.timestamp} · {entry.playbookTitle}
                          {entry.executionScope === 'local-folder' ? ' · Real Local Folder' : ''}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#F4F2ED]">
                          {entry.actionTitle}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400 break-all">
                          {entry.targetPath}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1 text-xs text-slate-300 border-t border-white/[0.06] pt-2.5">
                      {entry.affectedItems.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-blue-400">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-[11px] text-slate-500">
                      Rollback safety: {entry.rollbackHint}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleApprove(entry.id)}
                        disabled={pcPaused || busyEntryId === entry.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F2ED] px-3.5 py-2 text-xs font-semibold text-[#07080A] hover:bg-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{busyEntryId === entry.id ? 'Executing...' : 'Approve & Execute'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyEntryId === entry.id}
                        onClick={() => void handleReject(entry.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-300" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenRemoteApprovals}
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-500/20 cursor-pointer whitespace-nowrap"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>Review on Remote</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verifiable Action Ledger & One-Click Undo */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1117] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F4F2ED]">
                  Verifiable Action Ledger
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Every operation logs exact target paths, autonomy tier, and reversible Undo controls.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onResetOperatorDemo();
                  setFeedback({ tone: 'info', text: 'Sandbox restored to default playbooks & allowlist.' });
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#07080A] px-2.5 py-1.5 text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Sandbox</span>
              </button>
            </div>

            <div
              role="group"
              aria-label="Filter action ledger status"
              className="inline-flex flex-wrap rounded-lg border border-white/10 bg-[#07080A] p-1 gap-1"
            >
              {(['All', 'Pending Approval', 'Executed', 'Reverted'] as LedgerFilter[]).map((tab) => {
                const selected = ledgerFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLedgerFilter(tab)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-[#F4F2ED]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {filteredLedger.length === 0 ? (
              <div className="rounded-lg border border-white/[0.08] bg-[#07080A] p-4 text-xs text-slate-400">
                No ledger records match the selected filter.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {filteredLedger.map((entry) => (
                  <li key={entry.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums">
                        <span className="text-slate-500">{entry.timestamp}</span>
                        <span className="text-slate-600">·</span>
                        <span className={statusTextClass(entry.status)}>{entry.status}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{entry.autonomyTier}</span>
                        {entry.executionScope === 'local-folder' && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-blue-300">Local Disk</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#F4F2ED]">{entry.actionTitle}</p>
                      <p className="font-mono text-[11px] text-slate-400 break-all">{entry.targetPath}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.status === 'Executed' && entry.reversible && (
                        <button
                          type="button"
                          disabled={busyEntryId === entry.id}
                          onClick={() => void handleRevert(entry.id)}
                          aria-label={`Undo ${entry.actionTitle}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#07080A] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          <Undo2 className="h-3.5 w-3.5 text-amber-300" />
                          <span>{busyEntryId === entry.id ? 'Reverting...' : 'Undo'}</span>
                        </button>
                      )}
                      {entry.status === 'Reverted' && (
                        <span className="font-mono text-[11px] text-slate-500">Rolled back</span>
                      )}
                      {entry.status === 'Rejected' && (
                        <span className="font-mono text-[11px] text-red-300">Declined</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
