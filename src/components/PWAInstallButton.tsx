import { Check, Download, Monitor, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'compact';
  showManualDesktopFallback?: boolean;
  showInstalledConfirmation?: boolean;
}

export function PWAInstallButton({
  variant = 'primary',
  showManualDesktopFallback = false,
  showInstalledConfirmation = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isEmbeddedIframe, install } = usePWAInstall();
  const [guideMode, setGuideMode] = useState<'none' | 'ios' | 'desktop'>('none');

  if (isInstalled) {
    if (!showInstalledConfirmation) return null;
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200 whitespace-nowrap">
        <Check className="h-4 w-4 text-emerald-400" />
        <span>Installed as Desktop App</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (isIOS) {
      setGuideMode('ios');
      return;
    }
    setGuideMode('desktop');
  };

  if (!isInstallable && !isIOS && !showManualDesktopFallback) {
    return null;
  }

  const buttonClasses =
    variant === 'compact'
      ? 'inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-blue-400/35 bg-blue-500/10 px-3.5 py-2 text-xs font-medium text-blue-100 hover:bg-blue-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0'
      : 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#F4F2ED] px-5 py-2.5 text-sm font-semibold text-[#07080A] hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0';

  return (
    <>
      <button type="button" onClick={() => void handleClick()} className={buttonClasses}>
        <Download className="h-4 w-4" />
        <span>{isIOS ? 'Install on iPhone / iPad' : 'Install Desktop App'}</span>
      </button>

      {guideMode !== 'none' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install NexoraAI Desktop App"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0E1117] p-6 space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {guideMode === 'ios' ? (
                  <Share2 className="h-5 w-5 text-blue-400 shrink-0" />
                ) : (
                  <Monitor className="h-5 w-5 text-blue-400 shrink-0" />
                )}
                <h3 className="font-display text-lg font-semibold text-[#F4F2ED]">
                  {guideMode === 'ios' ? 'Install on iPhone / iPad' : 'Install NexoraAI on Windows'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close installation instructions"
                onClick={() => setGuideMode('none')}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {guideMode === 'ios' ? (
              <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Tap the <strong className="text-white">Share</strong> button in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>Launch NexoraAI directly from your home screen in standalone mode.</li>
              </ol>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                {isEmbeddedIframe && (
                  <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    You are currently viewing inside an embedded preview frame. Open NexoraAI in its own top-level{' '}
                    <strong className="text-white">Chrome</strong> or <strong className="text-white">Microsoft Edge</strong> tab first so Windows can install it.
                  </p>
                )}
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    Open this site in <strong className="text-white">Google Chrome</strong> or{' '}
                    <strong className="text-white">Microsoft Edge</strong> on Windows 10/11.
                  </li>
                  <li>
                    Click the <strong className="text-white">Install app</strong> icon in the address bar (or open browser menu →{' '}
                    <strong className="text-white">Cast, save, and share → Install page as app</strong>).
                  </li>
                  <li>
                    Pin it to your Desktop or Start Menu, then connect a test folder inside{' '}
                    <strong className="text-white">PC Business Operator</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setGuideMode('none')}
              className="w-full rounded-lg bg-[#F4F2ED] py-2.5 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
