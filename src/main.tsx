import { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected runtime error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NexoraAI render boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#07080A] text-[#F4F2ED] px-4">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#0E1117] p-6 space-y-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-blue-400">
              NexoraAI.com
            </p>
            <h1 className="font-display text-xl font-semibold">Unable to render workspace</h1>
            <p className="text-xs text-slate-400 font-mono break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#F4F2ED] px-4 py-2 text-xs font-semibold text-[#07080A] hover:bg-white cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
