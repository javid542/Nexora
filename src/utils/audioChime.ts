export function playCoreChime(type: 'activate' | 'reply' | 'skill' = 'activate'): void {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs =
      type === 'activate'
        ? [330, 495, 660]
        : type === 'skill'
          ? [440, 554.37, 659.25]
          : [523.25, 659.25];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.055, now + idx * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 900);
  } catch {
    // Audio playback may be blocked prior to gesture
  }
}
