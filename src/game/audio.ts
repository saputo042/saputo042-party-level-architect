import type { BgmGenre } from "../params/StageParams";

// BeatEngine — Web Audio によるプロシージャルBGM（Step 1 プレースホルダ）。
// 本番ではジャンル×BPMのBGMアセットマトリクスに差し替えるが、
// 「bpm パラメータが音と世界のテンポを同時に変える」体験はここで検証できる。

interface Pattern {
  kick: number[];   // 16ステップ (1=鳴る)
  snare: number[];
  hat: number[];
  bass: number[];   // 周波数(Hz)。0=休符
  swing: number;    // 0..0.3 偶数ステップの後ろ倒し
}

const A1 = 55, C2 = 65.4, D2 = 73.4, E2 = 82.4, G2 = 98;

const PATTERNS: Record<BgmGenre, Pattern> = {
  edm: {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1],
    bass:  [A1,A1,0,A1, A1,A1,0,A1, C2,C2,0,C2, G2,G2,0,G2],
    swing: 0,
  },
  funk: {
    kick:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,1,0],
    hat:   [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bass:  [E2,0,E2,G2, 0,E2,0,0, A1,0,A1,C2, 0,0,G2,0],
    swing: 0.12,
  },
  jazz: {
    kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,1, 0,1,1,0, 1,1,0,1, 1,0,1,0],
    bass:  [C2,0,E2,0, G2,0,E2,0, A1,0,C2,0, D2,0,G2,0],
    swing: 0.25,
  },
  rock: {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bass:  [E2,0,E2,0, E2,0,G2,0, A1,0,A1,0, G2,0,E2,0],
    swing: 0,
  },
  lofi: {
    kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    bass:  [C2,0,0,0, E2,0,0,0, A1,0,0,0, G2,0,0,0],
    swing: 0.18,
  },
  "8bit": {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bass:  [A1*2,C2*2,E2*2,C2*2, A1*2,C2*2,E2*2,C2*2, G2*2,C2*2,E2*2,C2*2, G2*2,D2*2,G2*2,D2*2],
    swing: 0,
  },
};

export class BeatEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private genre: BgmGenre = "lofi";
  private bpm = 100;
  private muted = false;
  private step = 0;
  private nextTime = 0;
  private timer: number | undefined;

  setParams(genre: BgmGenre, bpm: number): void {
    this.genre = genre;
    this.bpm = bpm;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // ブラウザの自動再生制限のため、最初のユーザー操作から呼ぶこと
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    void this.ctx?.close();
  }

  private schedule(): void {
    const ctx = this.ctx!;
    const stepDur = 60 / this.bpm / 4; // 16分音符
    while (this.nextTime < ctx.currentTime + 0.12) {
      const p = PATTERNS[this.genre];
      const i = this.step % 16;
      const swing = i % 2 === 1 ? stepDur * p.swing : 0;
      const t = this.nextTime + swing;
      if (p.kick[i]) this.kick(t);
      if (p.snare[i]) this.snare(t);
      if (p.hat[i]) this.hat(t);
      if (p.bass[i]) this.bassNote(t, p.bass[i], stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.16);
  }

  private snare(t: number): void {
    const ctx = this.ctx!;
    const buf = this.noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 0.13);
  }

  private hat(t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 0.05);
  }

  private bassNote(t: number, freq: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = this.genre === "8bit" ? "square" : "triangle";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(this.genre === "8bit" ? 0.12 : 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur);
  }

  private noiseCache: AudioBuffer | null = null;
  private noiseBuffer(): AudioBuffer {
    if (this.noiseCache) return this.noiseCache;
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseCache = buf;
    return buf;
  }
}
