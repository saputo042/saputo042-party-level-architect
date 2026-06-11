import type { ParamsPatch, PatchMeta } from "../params/ParamStore";

// デモ入力 — Step 4 で AI 翻訳 Worker が返すものと同じ形（patch + translationLog）を
// 手元で再現するサンプル集。本番のお題カード（設計書 1.2 Phase 2）の回答例に対応する。
export interface DemoInput {
  id: string;
  role: "A" | "B" | "C";
  author: string;
  sourceText: string;
  patch: ParamsPatch;
  translationLog: string[];
}

export const DEMO_INPUTS: DemoInput[] = [
  {
    id: "a1",
    role: "A",
    author: "ミカ",
    sourceText: "ネオン輝くディスコ",
    patch: {
      environment: {
        palette: "neon",
        backdrop: "disco",
        backdropFx: { lasers: 0.5, stars: 0.6 },
      },
    },
    translationLog: [
      'palette: "neon"',
      'backdrop: "disco"',
      "backdropFx.lasers: 0.5",
      "backdropFx.stars: 0.6",
    ],
  },
  {
    id: "a2",
    role: "A",
    author: "ミカ",
    sourceText: "アップテンポなEDMで、ハイスピード",
    patch: {
      environment: { bgm: { genre: "edm", bpm: 145 }, scrollSpeed: 1.6 },
    },
    translationLog: ['bgm.genre: "edm"', "bgm.bpm: 145", "scrollSpeed: 1.6"],
  },
  {
    id: "a3",
    role: "A",
    author: "ミカ",
    sourceText: "真夜中の屋上で、ゆったりlo-fi",
    patch: {
      environment: {
        palette: "midnight",
        backdrop: "rooftop",
        backdropFx: { stars: 0.8, lasers: 0 },
        bgm: { genre: "lofi", bpm: 88 },
        scrollSpeed: 0.8,
      },
    },
    translationLog: [
      'palette: "midnight"',
      'backdrop: "rooftop"',
      'bgm.genre: "lofi"',
      "bgm.bpm: 88",
      "scrollSpeed: 0.8",
    ],
  },
  {
    id: "b1",
    role: "B",
    author: "レン",
    sourceText: "跳ね回るスライムドリンク",
    patch: {
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
          archetype: "blob",
          skin: { base: "bottle", tint: "#05d9e8", scale: 1.0 },
          behavior: { moveSpeed: 160, bounce: 0.7, jumpPower: 460, aggression: 0.4 },
          spawn: "auto",
        },
      ],
    },
    translationLog: [
      'archetype: "blob"',
      'skin: "slime" + "bottle"',
      "bounce: 0.85",
      "jumpPower: 520",
      "moveSpeed: 140",
    ],
  },
  {
    id: "b2",
    role: "B",
    author: "レン",
    sourceText: "ふわふわ漂うおばけケーキ",
    patch: {
      enemies: [
        {
          id: "e0",
          archetype: "floater",
          skin: { base: "cake", tint: "#ffacc7", scale: 1.3 },
          behavior: { moveSpeed: 110, bounce: 0.2, jumpPower: 300, aggression: 0.3 },
          spawn: "auto",
        },
        {
          id: "e1",
          archetype: "floater",
          skin: { base: "ghost", tint: "#e0c3fc", scale: 1.0 },
          behavior: { moveSpeed: 150, bounce: 0.2, jumpPower: 300, aggression: 0.3 },
          spawn: "auto",
        },
      ],
    },
    translationLog: [
      'archetype: "floater"',
      'skin: "cake" + "ghost"',
      "moveSpeed: 110",
      "scale: 1.3",
    ],
  },
  {
    id: "b3",
    role: "B",
    author: "レン",
    sourceText: "ミラーボールのトラップ",
    patch: {
      gimmicks: [
        {
          id: "g-mirror",
          kind: "mirrorball",
          pos: { x: 0.5, y: 0.12 },
          params: { rotationSpeed: 0.9, flashIntensity: 0.6 },
        },
        {
          id: "g-spring",
          kind: "springpad",
          pos: { x: 0.55, y: 0.92 },
          params: { power: 1.7 },
        },
      ],
    },
    translationLog: [
      'kind: "mirrorball"',
      "rotationSpeed: 0.9",
      "flashIntensity: 0.6",
      'kind: "springpad" (bonus)',
    ],
  },
  {
    id: "c1",
    role: "C",
    author: "ソラ",
    sourceText: "ポップアート風のUI",
    patch: { ui: { theme: "popart", accentColor: "#ff2a6d" } },
    translationLog: ['theme: "popart"', 'accentColor: "#ff2a6d"'],
  },
  {
    id: "c2",
    role: "C",
    author: "ソラ",
    sourceText: "画面を埋め尽くす紙吹雪",
    patch: { ui: { particles: { type: "confetti", density: 0.9 } } },
    translationLog: ['particles.type: "confetti"', "particles.density: 0.9"],
  },
  {
    id: "c3",
    role: "C",
    author: "ソラ",
    sourceText: "クリアの瞬間はディスコ・ドロップで爆発",
    patch: { ui: { finale: { style: "discoDrop", intensity: 0.9 } } },
    translationLog: ['finale.style: "discoDrop"', "finale.intensity: 0.9"],
  },
];

export function metaOf(d: DemoInput): PatchMeta {
  return { sourceText: d.sourceText, author: d.author, translationLog: d.translationLog };
}

// ビルドログの1行: 「どの言葉が・何に翻訳されたか」を1行で見せる（学びの中核データ）
export function buildLogLine(sourceText: string, logLine: string): string {
  return `Translating "${sourceText}" → ${logLine}`;
}
