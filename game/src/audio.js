// Tiny WebAudio synth: every sound is generated, no audio files. A short
// noise buffer is reused for chops and sizzles; tones are plain oscillators.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = ctx.sampleRate * 0.25;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    } catch {
      return null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol ?? 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq, when = 0) {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t0 = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq ?? 2400;
    filter.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol ?? 0.1, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    pickup() { tone(520, 0.09, 'triangle', 0.1, 0, 760); },
    chop() { noise(0.09, 0.22, 1800); tone(180, 0.07, 'square', 0.06); },
    grillPlace() { noise(0.35, 0.08, 5200); },
    sizzle() { noise(0.18, 0.045, 6000); },
    ready() { tone(880, 0.12, 'sine', 0.1); tone(1318, 0.16, 'sine', 0.09, 0.1); },
    serve() {
      tone(523, 0.12, 'triangle', 0.12);
      tone(659, 0.12, 'triangle', 0.12, 0.09);
      tone(784, 0.2, 'triangle', 0.12, 0.18);
    },
    denied() { tone(160, 0.16, 'sawtooth', 0.07, 0, 110); },
    trash() { noise(0.15, 0.12, 900); },
    levelUp() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.09));
    },
    expire() { tone(330, 0.25, 'sawtooth', 0.08, 0, 180); },
    combo() { tone(1047, 0.1, 'sine', 0.1); tone(1568, 0.18, 'sine', 0.09, 0.08); },
    end() {
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.12));
    },
  };
}
