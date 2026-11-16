import { Check, Copy, Download, FileCode2, Info, Monitor, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppRoute } from '../components/Navbar';
import { RELEASE_INFO } from '../data/stonicData';

interface DownloadPageProps {
  onNavigate: (route: AppRoute) => void;
}

interface ReleaseManifest {
  version: string;
  releasedAt: string;
  generation: string;
  platform: string;
  size: string;
  sha256: string;
  changelog: string[];
  installerFilename: string;
  bootstrapperFilename: string;
  checksumFilename: string;
  bootstrapperUrl: string;
  checksumUrl: string;
}

export function DownloadPage({ onNavigate }: DownloadPageProps) {
  const [os, setOs] = useState<'windows' | 'macos'>('windows');
  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [manifest, setManifest] = useState<ReleaseManifest>({
    ...RELEASE_INFO,
    installerFilename: `NexoraAI-Setup-${RELEASE_INFO.version}.exe`,
    bootstrapperFilename: `NexoraAI-Setup-${RELEASE_INFO.version}-Bootstrapper.ps1`,
    checksumFilename: `NexoraAI-Setup-${RELEASE_INFO.version}.sha256`,
    bootstrapperUrl: '/api/download/bootstrapper',
    checksumUrl: '/api/download/checksum',
  });

  useEffect(() => {
    void fetch('/api/download/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReleaseManifest | null) => {
        if (data?.version) setManifest(data);
      })
      .catch(() => {});
  }, []);

  const handleCopyChecksum = async () => {
    try {
      await navigator.clipboard.writeText(manifest.sha256);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      setCopiedHash(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
          Official Release · {manifest.generation}
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#F4F2ED] text-balance">
          Download NexoraAI for Windows
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Verified Generation 3 desktop installer for Windows 10 and 11 (x64).
        </p>
      </div>

      {/* OS Selector */}
      <div className="mt-10 flex justify-center">
        <div
          role="group"
          aria-label="Select operating system"
          className="inline-flex rounded-lg border border-white/10 bg-[#0A0F1A] p-1 gap-1"
        >
          <button
            type="button"
            onClick={() => setOs('windows')}
            className={`rounded-md px-5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              os === 'windows' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Windows 10 / 11
          </button>
          <button
            type="button"
            onClick={() => setOs('macos')}
            className={`rounded-md px-5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              os === 'macos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            macOS · Soon
          </button>
        </div>
      </div>

      {/* Installer Card */}
      <div className="mt-8 rounded-xl border border-white/10 bg-[#0A0F1A] p-6 sm:p-8 max-w-2xl mx-auto">
        {os === 'windows' ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg border border-blue-400/20 bg-blue-500/10 p-4 text-xs text-slate-300">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p>
                <strong className="text-white">Recommended Browser:</strong> Safari may block large{' '}
                <code className="font-mono text-blue-200">.exe</code> downloads. For smoothest delivery, download in{' '}
                <strong className="text-white">Google Chrome</strong> or Microsoft Edge.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-blue-300">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    {manifest.installerFilename}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 tabular-nums">
                    {manifest.size} · Version {manifest.version} · {manifest.platform}
                  </p>
                </div>
              </div>

              <a
                href={manifest.bootstrapperUrl}
                download={manifest.bootstrapperFilename}
                onClick={() => setDownloadStarted(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Download Setup Script</span>
              </a>
            </div>

            {downloadStarted && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100 space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Setup Verification Bootstrapper Downloaded ({manifest.bootstrapperFilename})
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Run the downloaded PowerShell script to verify the SHA-256 signature of{' '}
                  <span className="font-mono text-white">{manifest.installerFilename}</span>, then sign in with Google using the same account activated in your{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/account')}
                    className="underline text-white hover:text-blue-300 cursor-pointer"
                  >
                    Account portal
                  </button>
                  .
                </p>
              </div>
            )}

            {/* SHA-256 Verification */}
            <div className="rounded-lg border border-white/10 bg-[#05070B] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-blue-400" />
                  SHA-256 Checksum
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={manifest.checksumUrl}
                    download={manifest.checksumFilename}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>.sha256 file</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyChecksum}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    {copiedHash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-400 tabular-nums">
                {manifest.sha256}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              macOS Generation 3 · In Preparation
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              The native Apple Silicon &amp; macOS build is currently undergoing voice-latency calibration. Windows 10 &amp; 11 x64 is available immediately.
            </p>
            <button
              type="button"
              onClick={() => setOs('windows')}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
            >
              Switch back to Windows build
            </button>
          </div>
        )}
      </div>

      {/* Release Changelog */}
      <div className="mt-10 max-w-2xl mx-auto rounded-xl border border-white/10 bg-[#0A0F1A] p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-display text-base font-semibold text-white">
            Changelog · v{manifest.version}
          </h3>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            Released {manifest.releasedAt}
          </span>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
          {manifest.changelog.map((entry) => (
            <li key={entry} className="flex items-start gap-2.5">
              <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <span>{entry}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
