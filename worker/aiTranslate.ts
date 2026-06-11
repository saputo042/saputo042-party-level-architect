import Anthropic from "@anthropic-ai/sdk";
import type { TranslationResult } from "../shared/translate";
import type {
  BackdropName,
  BgmGenre,
  EnemyArchetype,
  EnemySkinBase,
  FinaleStyle,
  PaletteName,
  ParticleType,
  UiTheme,
} from "../src/params/StageParams";

// AI翻訳レイヤー（設計書 3.5）— Claude API（tool use強制 + strictスキーマ）で
// 「言葉 → StageParamsパッチ + 翻訳ログ」を生成する。
// 戻り値は辞書翻訳(shared/translate.ts)と同形。失敗/タイムアウト時は null を返し、
// 呼び出し側（RoomDO）が辞書にフォールバックする — 体験は決して途切れない。

// レイテンシ優先で claude-haiku-4-5（設計書3.5の選定。表現力不足ならsonnetへ）
const MODEL = "claude-haiku-4-5";
const TIMEOUT_MS = 3500; // 設計書のレイテンシ予算4秒の内側。リトライせず即フォールバック

const SYSTEM_PROMPT = `あなたはパーティアクションゲームの「ゲームデザイン翻訳者」です。
美大生クリエイターが言葉で描いたビジョンを、ゲームエンジンのパラメータに翻訳します。

原則:
- 言葉の温度感（激しさ・速さ・可愛さ・派手さ）を必ずパラメータの大小に反映する。
  「すごく」「画面を埋め尽くす」「嵐のように」→ 値を大きく振り切る。
  「ちょっと」「ささやかな」「ゆるい」→ 控えめな値にする。
- 比喩や造語も意図を汲んで最も近い選択肢に翻訳する。絶対に翻訳を諦めない。
- note には「どう読み取ったか」を日本語20字以内で書く（例: 弾ける勢いを跳躍力に変換）。`;

interface PromptSpec {
  schema: Record<string, unknown>;
  toResult: (input: Record<string, unknown>) => TranslationResult;
}

const PALETTES: PaletteName[] = ["neon", "pastel", "midnight", "tropical", "retro", "monochrome"];
const BACKDROPS: BackdropName[] = ["disco", "rooftop", "beach", "space", "kitchen", "street"];
const GENRES: BgmGenre[] = ["edm", "funk", "jazz", "rock", "lofi", "8bit"];
const SKINS: EnemySkinBase[] = ["slime", "ball", "ghost", "bottle", "cake"];
const ARCHETYPES: EnemyArchetype[] = ["blob", "spinner", "chaser", "floater", "shooter"];
const THEMES: UiTheme[] = ["popart", "cyber", "handdrawn", "luxury", "kawaii"];
const PARTICLES: ParticleType[] = ["confetti", "sparkle", "bubbles", "petals", "pixels"];
const FINALES: FinaleStyle[] = ["fireworks", "discoDrop", "rainbowWave"];

// strictスキーマは数値範囲(minimum/maximum)非対応のため、範囲はdescriptionに書き
// サーバ側で必ずクランプする
const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const pick = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const hexColor = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;

const noteProp = {
  note: { type: "string", description: "翻訳意図のひとこと（日本語20字以内）" },
};

const PROMPT_SPECS: Record<string, PromptSpec> = {
  a1: {
    schema: {
      type: "object",
      properties: {
        palette: { type: "string", enum: PALETTES, description: "世界の色調" },
        backdrop: { type: "string", enum: BACKDROPS, description: "背景の舞台" },
        stars: { type: "number", description: "星の量 0〜1" },
        lasers: { type: "number", description: "レーザー光線の量 0〜1" },
        fog: { type: "number", description: "霧の濃さ 0〜1" },
        ...noteProp,
      },
      required: ["palette", "backdrop", "stars", "lasers", "fog", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const palette = pick(i.palette, PALETTES, "neon");
      const backdrop = pick(i.backdrop, BACKDROPS, "disco");
      const fx = {
        stars: clamp(i.stars, 0, 1, 0.2),
        lasers: clamp(i.lasers, 0, 1, 0),
        fog: clamp(i.fog, 0, 1, 0.1),
      };
      return {
        patch: { environment: { palette, backdrop, backdropFx: fx } },
        translationLog: [
          `palette: "${palette}"`,
          `backdrop: "${backdrop}"`,
          `backdropFx: stars ${fx.stars} / lasers ${fx.lasers} / fog ${fx.fog}`,
          noteLine(i),
        ],
      };
    },
  },
  a2: {
    schema: {
      type: "object",
      properties: {
        genre: { type: "string", enum: GENRES, description: "BGMジャンル" },
        bpm: { type: "integer", description: "テンポBPM 80〜180" },
        ...noteProp,
      },
      required: ["genre", "bpm", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const genre = pick(i.genre, GENRES, "edm");
      const bpm = Math.round(clamp(i.bpm, 80, 180, 120));
      return {
        patch: { environment: { bgm: { genre, bpm } } },
        translationLog: [`bgm.genre: "${genre}"`, `bgm.bpm: ${bpm}`, noteLine(i)],
      };
    },
  },
  a3: {
    schema: {
      type: "object",
      properties: {
        scrollSpeed: { type: "number", description: "世界の速度係数 0.5〜2.0（1.0が標準）" },
        gravity: { type: "number", description: "重力 600〜1400（900が標準）" },
        ...noteProp,
      },
      required: ["scrollSpeed", "gravity", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const scrollSpeed = Math.round(clamp(i.scrollSpeed, 0.5, 2.0, 1.0) * 100) / 100;
      const gravity = Math.round(clamp(i.gravity, 600, 1400, 900));
      return {
        patch: { environment: { scrollSpeed, gravity } },
        translationLog: [`scrollSpeed: ${scrollSpeed}`, `gravity: ${gravity}`, noteLine(i)],
      };
    },
  },
  b1: {
    schema: {
      type: "object",
      properties: {
        base: { type: "string", enum: SKINS, description: "敵の見た目のベース形状" },
        tint: { type: "string", description: "敵の色 #rrggbb形式" },
        scale: { type: "number", description: "大きさ 0.5〜2.5（1.2が標準）" },
        ...noteProp,
      },
      required: ["base", "tint", "scale", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const base = pick(i.base, SKINS, "slime");
      const tint = hexColor(i.tint, "#7cfc00");
      const scale = Math.round(clamp(i.scale, 0.5, 2.5, 1.2) * 100) / 100;
      return {
        enemy: { base, tint, scale },
        translationLog: [
          `skin.base: "${base}"`,
          `skin.tint: "${tint}"`,
          `skin.scale: ${scale}`,
          noteLine(i),
        ],
      };
    },
  },
  b2: {
    schema: {
      type: "object",
      properties: {
        archetype: {
          type: "string",
          enum: ARCHETYPES,
          description: "動きの型: blob=跳ねる spinner=回る chaser=追う floater=漂う shooter=撃つ",
        },
        moveSpeed: { type: "number", description: "移動速度 40〜400（140が標準）" },
        bounce: { type: "number", description: "弾性 0〜1（跳ねるほど大）" },
        jumpPower: { type: "number", description: "跳躍力 100〜800" },
        aggression: { type: "number", description: "執拗さ 0〜1" },
        ...noteProp,
      },
      required: ["archetype", "moveSpeed", "bounce", "jumpPower", "aggression", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const archetype = pick(i.archetype, ARCHETYPES, "blob");
      const moveSpeed = Math.round(clamp(i.moveSpeed, 40, 400, 140));
      const bounce = Math.round(clamp(i.bounce, 0, 1, 0.5) * 100) / 100;
      const jumpPower = Math.round(clamp(i.jumpPower, 100, 800, 460));
      const aggression = Math.round(clamp(i.aggression, 0, 1, 0.4) * 100) / 100;
      return {
        enemy: { archetype, moveSpeed, bounce, jumpPower, aggression },
        translationLog: [
          `archetype: "${archetype}"`,
          `moveSpeed: ${moveSpeed}`,
          `bounce: ${bounce}`,
          `jumpPower: ${jumpPower}`,
          `aggression: ${aggression}`,
          noteLine(i),
        ],
      };
    },
  },
  c1: {
    schema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: THEMES, description: "UIテーマ" },
        accentColor: { type: "string", description: "アクセントカラー #rrggbb形式" },
        ...noteProp,
      },
      required: ["theme", "accentColor", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const theme = pick(i.theme, THEMES, "popart");
      const accentColor = hexColor(i.accentColor, "#ff2a6d");
      return {
        patch: { ui: { theme, accentColor } },
        translationLog: [`ui.theme: "${theme}"`, `accentColor: "${accentColor}"`, noteLine(i)],
      };
    },
  },
  c2: {
    schema: {
      type: "object",
      properties: {
        particleType: { type: "string", enum: PARTICLES, description: "舞うパーティクルの種類" },
        density: { type: "number", description: "密度 0〜1（画面を埋め尽くす=0.9以上）" },
        ...noteProp,
      },
      required: ["particleType", "density", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const type = pick(i.particleType, PARTICLES, "confetti");
      const density = Math.round(clamp(i.density, 0, 1, 0.6) * 100) / 100;
      return {
        patch: { ui: { particles: { type, density } } },
        translationLog: [`particles.type: "${type}"`, `particles.density: ${density}`, noteLine(i)],
      };
    },
  },
  c3: {
    schema: {
      type: "object",
      properties: {
        finaleStyle: { type: "string", enum: FINALES, description: "クリア演出の様式" },
        intensity: { type: "number", description: "派手さ 0〜1" },
        ...noteProp,
      },
      required: ["finaleStyle", "intensity", "note"],
      additionalProperties: false,
    },
    toResult: (i) => {
      const style = pick(i.finaleStyle, FINALES, "fireworks");
      const intensity = Math.round(clamp(i.intensity, 0, 1, 0.7) * 100) / 100;
      return {
        patch: { ui: { finale: { style, intensity } } },
        translationLog: [`finale.style: "${style}"`, `finale.intensity: ${intensity}`, noteLine(i)],
      };
    },
  },
};

function noteLine(i: Record<string, unknown>): string {
  return typeof i.note === "string" && i.note ? `── ${i.note}` : "── 翻訳完了";
}

const PROMPT_CONTEXT: Record<string, string> = {
  a1: "お題「この世界の舞台はどんな場所？」",
  a2: "お題「この世界に流れる音楽は？」",
  a3: "お題「このゲームのスピード感は？」",
  b1: "お題「行く手を阻む敵はどんな姿？」",
  b2: "お題「その敵はどう動く？」",
  c1: "お題「スコアや体力の表示はどんなデザイン？」",
  c2: "お題「ジャンプの瞬間、画面に何が舞う？」",
  c3: "お題「クリアの瞬間の最高の演出は？」",
};

// 失敗時は null（呼び出し側が辞書翻訳へフォールバック）
export async function aiTranslate(
  apiKey: string,
  promptId: string,
  text: string
): Promise<TranslationResult | null> {
  const spec = PROMPT_SPECS[promptId];
  if (!spec) return null;

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "set_stage_params",
          description: "クリエイターの言葉をゲームステージのパラメータに翻訳して設定する",
          strict: true,
          input_schema: spec.schema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: "set_stage_params" },
      messages: [
        {
          role: "user",
          content: `${PROMPT_CONTEXT[promptId]}\nクリエイターの回答: 「${text}」\nこのビジョンをパラメータに翻訳してください。`,
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!toolUse) return null;
    return spec.toResult(toolUse.input as Record<string, unknown>);
  } catch (err) {
    // タイムアウト・レート制限・APIエラーはすべて辞書フォールバックに委ねる
    // （ログはwrangler tailで監視できるよう残す）
    console.error("aiTranslate failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
