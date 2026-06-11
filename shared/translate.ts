import type { ParamsPatch } from "../src/params/ParamStore";
import type {
  BackdropName,
  BgmGenre,
  EnemyArchetype,
  EnemyDef,
  EnemySkinBase,
  PaletteName,
  ParticleType,
  FinaleStyle,
  UiTheme,
} from "../src/params/StageParams";

// キーワード辞書翻訳（設計書 3.5 のフォールバック実装）。
// Step 4 で Claude API による翻訳が主役になり、これはAPI失敗時の保険に回る。
// 戻り値の形は AI 翻訳と同一: パッチ + 「どの言葉が何になったか」のログ。

export interface EnemyTraits {
  archetype?: EnemyArchetype;
  base?: EnemySkinBase;
  tint?: string;
  scale?: number;
  moveSpeed?: number;
  bounce?: number;
  jumpPower?: number;
  aggression?: number;
}

export interface TranslationResult {
  patch?: ParamsPatch;
  enemy?: EnemyTraits; // b1/b2はテンプレートに合流させる（配列丸ごと置換と衝突しないように）
  translationLog: string[];
}

type Dict<T extends string> = [RegExp, T][];

const PALETTES: Dict<PaletteName> = [
  [/ネオン|サイバー|蛍光/i, "neon"],
  [/パステル|ゆめかわ|淡い/i, "pastel"],
  [/夜|ミッドナイト|星空/i, "midnight"],
  [/南国|トロピカル|夏|常夏/i, "tropical"],
  [/レトロ|昭和|セピア/i, "retro"],
  [/モノクロ|白黒|無彩色/i, "monochrome"],
];

const BACKDROPS: Dict<BackdropName> = [
  [/ディスコ|クラブ|ダンスフロア/i, "disco"],
  [/屋上|ビル|ルーフ/i, "rooftop"],
  [/ビーチ|海|砂浜/i, "beach"],
  [/宇宙|スペース|銀河|星/i, "space"],
  [/キッチン|お菓子|パーティ会場|テーブル/i, "kitchen"],
  [/街|ストリート|道/i, "street"],
];

const GENRES: Dict<BgmGenre> = [
  [/EDM|エレクトロ|クラブ|ダンス/i, "edm"],
  [/ファンク|ディスコ|グルーヴ/i, "funk"],
  [/ジャズ|おしゃれ|バー/i, "jazz"],
  [/ロック|バンド|激し/i, "rock"],
  [/lo-?fi|ローファイ|チル|ゆったり|まったり/i, "lofi"],
  [/8bit|ピコピコ|ゲーム音楽|チップ/i, "8bit"],
];

const SKINS: Dict<EnemySkinBase> = [
  [/スライム|ドリンク|ジュース|ぷるぷる/i, "slime"],
  [/ボール|玉|ミラーボール/i, "ball"],
  [/おばけ|ゴースト|幽霊/i, "ghost"],
  [/ボトル|瓶|シャンパン/i, "bottle"],
  [/ケーキ|スイーツ|お菓子/i, "cake"],
];

const ARCHETYPES: Dict<EnemyArchetype> = [
  [/跳ね|ぴょん|ジャンプ|バウンド/i, "blob"],
  [/回る|ぐるぐる|回転|スピン/i, "spinner"],
  [/追い|追って|しつこ|迫って/i, "chaser"],
  [/ふわふわ|浮|漂/i, "floater"],
  [/撃|飛ばし|シュート|発射/i, "shooter"],
];

const THEMES: Dict<UiTheme> = [
  [/ポップ|コミック|アメコミ/i, "popart"],
  [/サイバー|近未来|デジタル/i, "cyber"],
  [/手書き|ゆる|らくがき/i, "handdrawn"],
  [/高級|ラグジュアリー|ホテル|ゴールド/i, "luxury"],
  [/かわい|キュート|ぴんく|ピンク/i, "kawaii"],
];

const PARTICLES: Dict<ParticleType> = [
  [/紙吹雪|コンフェッティ/i, "confetti"],
  [/きらきら|星|スター/i, "sparkle"],
  [/泡|シャボン|バブル/i, "bubbles"],
  [/花びら|桜|フラワー/i, "petals"],
  [/ドット|ピクセル|四角/i, "pixels"],
];

const FINALES: Dict<FinaleStyle> = [
  [/花火|打ち上げ/i, "fireworks"],
  [/ディスコ|ドロップ|爆発/i, "discoDrop"],
  [/虹|レインボー|波/i, "rainbowWave"],
];

const COLOR_WORDS: Dict<string> = [
  [/緑|グリーン|抹茶/i, "#7cfc00"],
  [/ピンク|桃/i, "#ff7eb6"],
  [/青|水色|ブルー/i, "#05d9e8"],
  [/赤|レッド|炎/i, "#ff2a6d"],
  [/黄|金|ゴールド/i, "#ffd700"],
  [/紫|パープル/i, "#b14aed"],
  [/白|ホワイト/i, "#f8f9fa"],
];

function hit<T extends string>(dict: Dict<T>, text: string): T | undefined {
  for (const [re, v] of dict) if (re.test(text)) return v;
  return undefined;
}

const FAST = /速|ハイスピード|アップテンポ|嵐|疾走|爆速/;
const SLOW = /ゆっくり|ゆったり|スロー|のんびり|お散歩|まったり/;
const INTENSE = /すごく|めっちゃ|超|最高に|限界|画面を埋め/;

export function translateText(promptId: string, text: string): TranslationResult {
  const log: string[] = [];
  const boost = INTENSE.test(text);

  switch (promptId) {
    case "a1": {
      const palette = hit(PALETTES, text) ?? "neon";
      const backdrop = hit(BACKDROPS, text) ?? "disco";
      log.push(`palette: "${palette}"`, `backdrop: "${backdrop}"`);
      const fx: { stars?: number; lasers?: number; fog?: number } = {};
      if (/星|夜空/.test(text)) (fx.stars = 0.8), log.push("backdropFx.stars: 0.8");
      if (/レーザー|光線|ネオン/.test(text)) (fx.lasers = 0.5), log.push("backdropFx.lasers: 0.5");
      if (/霧|もや|煙/.test(text)) (fx.fog = 0.5), log.push("backdropFx.fog: 0.5");
      return { patch: { environment: { palette, backdrop, backdropFx: fx } }, translationLog: log };
    }
    case "a2": {
      const genre = hit(GENRES, text) ?? "edm";
      const num = text.match(/(\d{2,3})/);
      const bpm = num
        ? Math.min(180, Math.max(80, parseInt(num[1], 10)))
        : FAST.test(text) ? 150 : SLOW.test(text) ? 88 : 120;
      log.push(`bgm.genre: "${genre}"`, `bgm.bpm: ${bpm}`);
      return { patch: { environment: { bgm: { genre, bpm } } }, translationLog: log };
    }
    case "a3": {
      const scrollSpeed = FAST.test(text) ? (boost ? 1.9 : 1.6) : SLOW.test(text) ? 0.7 : 1.1;
      const gravity = FAST.test(text) ? 1100 : SLOW.test(text) ? 750 : 900;
      log.push(`scrollSpeed: ${scrollSpeed}`, `gravity: ${gravity}`);
      return { patch: { environment: { scrollSpeed, gravity } }, translationLog: log };
    }
    case "b1": {
      const base = hit(SKINS, text) ?? "slime";
      const tint = hit(COLOR_WORDS, text) ?? DEFAULT_TINT[base];
      const scale = /巨大|でか|大きい/.test(text) ? 1.8 : /ちび|小さ|ミニ/.test(text) ? 0.7 : 1.2;
      const archetype = hit(ARCHETYPES, text); // 見た目の文に動きが書いてあれば拾う
      log.push(`skin.base: "${base}"`, `skin.tint: "${tint}"`, `skin.scale: ${scale}`);
      if (archetype) log.push(`archetype: "${archetype}"`);
      return { enemy: { base, tint, scale, archetype }, translationLog: log };
    }
    case "b2": {
      const archetype = hit(ARCHETYPES, text) ?? "blob";
      const moveSpeed = FAST.test(text) || boost ? 200 : SLOW.test(text) ? 90 : 140;
      const bounce = /跳ね|ぴょん|バウンド/.test(text) ? (boost ? 0.95 : 0.8) : 0.3;
      const jumpPower = bounce > 0.5 ? 520 : 360;
      const aggression = /追い|しつこ|迫/.test(text) ? (boost ? 0.9 : 0.6) : 0.3;
      log.push(
        `archetype: "${archetype}"`,
        `moveSpeed: ${moveSpeed}`,
        `bounce: ${bounce}`,
        `jumpPower: ${jumpPower}`,
        `aggression: ${aggression}`
      );
      return { enemy: { archetype, moveSpeed, bounce, jumpPower, aggression }, translationLog: log };
    }
    case "c1": {
      const theme = hit(THEMES, text) ?? "popart";
      const accentColor = hit(COLOR_WORDS, text) ?? THEME_ACCENT[theme];
      log.push(`ui.theme: "${theme}"`, `accentColor: "${accentColor}"`);
      return { patch: { ui: { theme, accentColor } }, translationLog: log };
    }
    case "c2": {
      const type = hit(PARTICLES, text) ?? "confetti";
      const density = boost ? 0.9 : 0.6;
      log.push(`particles.type: "${type}"`, `particles.density: ${density}`);
      return { patch: { ui: { particles: { type, density } } }, translationLog: log };
    }
    case "c3": {
      const style = hit(FINALES, text) ?? "fireworks";
      const intensity = boost ? 1.0 : 0.7;
      log.push(`finale.style: "${style}"`, `finale.intensity: ${intensity}`);
      return { patch: { ui: { finale: { style, intensity } } }, translationLog: log };
    }
    default:
      return { translationLog: [`(未知のお題 ${promptId} — 変更なし)`] };
  }
}

const DEFAULT_TINT: Record<EnemySkinBase, string> = {
  slime: "#7cfc00",
  ball: "#dddddd",
  ghost: "#e0c3fc",
  bottle: "#05d9e8",
  cake: "#ffacc7",
};

const THEME_ACCENT: Record<UiTheme, string> = {
  popart: "#ff2a6d",
  cyber: "#00e5ff",
  handdrawn: "#ffffff",
  luxury: "#d4af37",
  kawaii: "#ff7eb6",
};

// b1/b2 の断片をマージしてエネミー配列を組み立てる（DOが保持するテンプレートから）
export function buildEnemiesFromTraits(traits: EnemyTraits): EnemyDef[] {
  const base: EnemyDef = {
    id: "e0",
    archetype: traits.archetype ?? "blob",
    skin: {
      base: traits.base ?? "slime",
      tint: traits.tint ?? DEFAULT_TINT[traits.base ?? "slime"],
      scale: traits.scale ?? 1.2,
    },
    behavior: {
      moveSpeed: traits.moveSpeed ?? 140,
      bounce: traits.bounce ?? 0.6,
      jumpPower: traits.jumpPower ?? 460,
      aggression: traits.aggression ?? 0.4,
    },
    spawn: "auto",
  };
  // 同テンレートから3体（少しずつスケール違い）で賑やかにする
  return [0, 1, 2].map((i) => ({
    ...base,
    id: `e${i}`,
    skin: { ...base.skin, scale: Math.round(base.skin.scale * (1 - i * 0.15) * 100) / 100 },
    behavior: { ...base.behavior },
  }));
}
