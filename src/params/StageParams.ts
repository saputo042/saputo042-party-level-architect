// StageParams — ゲームの全状態を表す単一スキーマ（設計書 3.4）
// このオブジェクトが「言葉 → 世界」の翻訳先。Step 1 ではデバッグパネルが書き換え役を担う。

export type PaletteName =
  | "neon" | "pastel" | "midnight" | "tropical" | "retro" | "monochrome";
export type BackdropName =
  | "disco" | "rooftop" | "beach" | "space" | "kitchen" | "street";
export type BgmGenre = "edm" | "funk" | "jazz" | "rock" | "lofi" | "8bit";
export type EnemyArchetype = "blob" | "spinner" | "chaser" | "floater" | "shooter";
export type EnemySkinBase = "slime" | "ball" | "ghost" | "bottle" | "cake";
export type GimmickKind =
  | "mirrorball" | "springpad" | "confettiCannon" | "slipFloor" | "spotlight";
export type UiTheme = "popart" | "cyber" | "handdrawn" | "luxury" | "kawaii";
export type ParticleType = "confetti" | "sparkle" | "bubbles" | "petals" | "pixels";
export type FinaleStyle = "fireworks" | "discoDrop" | "rainbowWave";

export interface EnemyDef {
  id: string;
  archetype: EnemyArchetype;
  skin: { base: EnemySkinBase; tint: string; scale: number };
  behavior: { moveSpeed: number; bounce: number; jumpPower: number; aggression: number };
  spawn: { x: number; y: number } | "auto";
}

export interface GimmickDef {
  id: string;
  kind: GimmickKind;
  pos: { x: number; y: number }; // 0..1 正規化座標
  params: Record<string, number>;
}

export interface StageParams {
  environment: {
    palette: PaletteName;
    backdrop: BackdropName;
    backdropFx: { fog: number; stars: number; lasers: number }; // 0..1
    bgm: { genre: BgmGenre; bpm: number }; // 80..180
    scrollSpeed: number; // 0.5..2.0
    gravity: number;     // 600..1400
  };
  enemies: EnemyDef[];
  gimmicks: GimmickDef[];
  ui: {
    theme: UiTheme;
    accentColor: string;
    particles: { type: ParticleType; density: number }; // density 0..1
    finale: { style: FinaleStyle; intensity: number };  // intensity 0..1
  };
  meta: { title: string; credits: { role: "A" | "B" | "C"; name: string }[] };
}

export const DEFAULT_PARAMS: StageParams = {
  environment: {
    palette: "monochrome",
    backdrop: "street",
    backdropFx: { fog: 0.1, stars: 0.2, lasers: 0 },
    bgm: { genre: "lofi", bpm: 100 },
    scrollSpeed: 1.0,
    gravity: 900,
  },
  enemies: [
    {
      id: "e0",
      archetype: "blob",
      skin: { base: "slime", tint: "#9e9e9e", scale: 1.0 },
      behavior: { moveSpeed: 120, bounce: 0.4, jumpPower: 420, aggression: 0.3 },
      spawn: "auto",
    },
  ],
  gimmicks: [],
  ui: {
    theme: "cyber",
    accentColor: "#00e5ff",
    particles: { type: "pixels", density: 0.3 },
    finale: { style: "fireworks", intensity: 0.6 },
  },
  meta: { title: "UNTITLED WORLD", credits: [] },
};

// デモ・リハーサル用: 全パラメータが反映された「完成形」を一発で確認するプリセット
// （URL末尾 #party、またはデバッグパネルの Party Preset ボタンで適用）
export const PARTY_PRESET: StageParams = {
  environment: {
    palette: "neon",
    backdrop: "disco",
    backdropFx: { fog: 0.15, stars: 0.7, lasers: 0.6 },
    bgm: { genre: "edm", bpm: 128 },
    scrollSpeed: 1.4,
    gravity: 1000,
  },
  enemies: [
    {
      id: "e0",
      archetype: "blob",
      skin: { base: "slime", tint: "#7cfc00", scale: 1.2 },
      behavior: { moveSpeed: 140, bounce: 0.85, jumpPower: 520, aggression: 0.5 },
      spawn: "auto",
    },
    {
      id: "e1",
      archetype: "floater",
      skin: { base: "ghost", tint: "#ff2a6d", scale: 1.0 },
      behavior: { moveSpeed: 180, bounce: 0.2, jumpPower: 300, aggression: 0.4 },
      spawn: "auto",
    },
    {
      id: "e2",
      archetype: "blob",
      skin: { base: "bottle", tint: "#05d9e8", scale: 1.1 },
      behavior: { moveSpeed: 160, bounce: 0.7, jumpPower: 460, aggression: 0.3 },
      spawn: "auto",
    },
  ],
  gimmicks: [
    { id: "g-mirror", kind: "mirrorball", pos: { x: 0.5, y: 0.12 }, params: { rotationSpeed: 0.8, flashIntensity: 0.5 } },
    { id: "g-cannon", kind: "confettiCannon", pos: { x: 0.85, y: 0.85 }, params: { interval: 2.0, burst: 50 } },
    { id: "g-spring", kind: "springpad", pos: { x: 0.55, y: 0.92 }, params: { power: 1.7 } },
  ],
  ui: {
    theme: "popart",
    accentColor: "#ff2a6d",
    particles: { type: "confetti", density: 0.7 },
    finale: { style: "discoDrop", intensity: 0.8 },
  },
  meta: { title: "NEON SLIME CARNIVAL", credits: [] },
};

// パレット定義: 名前 → 実際の色セット（「ネオン」という言葉が物理的な色になる場所）
export const PALETTES: Record<
  PaletteName,
  { skyTop: string; skyBottom: string; ground: number; decor: number; fxTint: number }
> = {
  neon:       { skyTop: "#0d0221", skyBottom: "#3a0ca3", ground: 0x2b2d42, decor: 0xff2a6d, fxTint: 0x05d9e8 },
  pastel:     { skyTop: "#ffd6e8", skyBottom: "#c1f0f6", ground: 0xb8e0d2, decor: 0xffacc7, fxTint: 0xfff5ba },
  midnight:   { skyTop: "#03045e", skyBottom: "#023e8a", ground: 0x1b263b, decor: 0x778da9, fxTint: 0x90e0ef },
  tropical:   { skyTop: "#ff9e00", skyBottom: "#ffea00", ground: 0x38b000, decor: 0xff5400, fxTint: 0x80ffdb },
  retro:      { skyTop: "#582f0e", skyBottom: "#e6ccb2", ground: 0x7f4f24, decor: 0xdda15e, fxTint: 0xffe8d6 },
  monochrome: { skyTop: "#212529", skyBottom: "#495057", ground: 0x343a40, decor: 0x868e96, fxTint: 0xdee2e6 },
};

// デバッグパネル用: 敵テンプレート × 数 → EnemyDef[]
export function buildEnemies(template: Omit<EnemyDef, "id" | "spawn">, count: number): EnemyDef[] {
  return Array.from({ length: count }, (_, i) => ({
    ...template,
    skin: { ...template.skin },
    behavior: { ...template.behavior },
    id: `e${i}`,
    spawn: "auto" as const,
  }));
}

// ギミックの既定配置（Step 3 でスマホからのスタンプ配置に置き換わる）
export const GIMMICK_PRESETS: Record<GimmickKind, GimmickDef> = {
  mirrorball:     { id: "g-mirror", kind: "mirrorball", pos: { x: 0.5, y: 0.12 }, params: { rotationSpeed: 0.6, flashIntensity: 0.5 } },
  springpad:      { id: "g-spring", kind: "springpad", pos: { x: 0.55, y: 0.92 }, params: { power: 1.6 } },
  confettiCannon: { id: "g-cannon", kind: "confettiCannon", pos: { x: 0.85, y: 0.85 }, params: { interval: 2.5, burst: 40 } },
  slipFloor:      { id: "g-slip", kind: "slipFloor", pos: { x: 0.35, y: 0.92 }, params: { width: 0.2 } },
  spotlight:      { id: "g-spot", kind: "spotlight", pos: { x: 0.2, y: 0.5 }, params: { radius: 140 } },
};
