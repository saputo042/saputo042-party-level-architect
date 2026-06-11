import Phaser from "phaser";
import { DEFAULT_PARAMS, PARTY_PRESET } from "./params/StageParams";
import { ParamStore } from "./params/ParamStore";
import { StageScene, STAGE_H, STAGE_W } from "./game/StageScene";
import { BeatEngine } from "./game/audio";
import { Hud } from "./ui/hud";
import { createDebugPanel } from "./debug/panel";
import { buildLogLine, DEMO_INPUTS, metaOf } from "./demo/inputs";

// dev限定: 実行時エラーをDOMへ書き出す（ヘッドレスブラウザでの自動検証用）
if (import.meta.env.DEV) {
  const errlog = document.createElement("div");
  errlog.id = "errlog";
  errlog.style.display = "none";
  document.body.appendChild(errlog);
  window.addEventListener("error", (e) => (errlog.textContent += `[ERR] ${e.message}\n`));
  window.addEventListener("unhandledrejection", (e) => (errlog.textContent += `[REJ] ${e.reason}\n`));
}

const store = new ParamStore(DEFAULT_PARAMS);
const beat = new BeatEngine();
const hud = new Hud(document.getElementById("hud")!);
let bgmOn = true;

const scene = new StageScene(store, {
  onScore: (v) => hud.setScore(v),
  onHp: (v) => hud.setHp(v),
  onBuildWhiteout: () => beat.setMuted(true),
  onBuildDrop: () => beat.setMuted(!bgmOn),
  // 儀式付きパッチはシーンの「反映」瞬間にここへ届く。HUD・BGMも同じ瞬間に変える
  onPatchApplied: (patch) => {
    if (patch.ui || patch.meta) hud.apply(store.params.ui, store.params.meta);
    if (patch.environment?.bgm) {
      beat.setParams(store.params.environment.bgm.genre, store.params.environment.bgm.bpm);
    }
  },
});

// ?headless: rAFが回らないヘッドレスブラウザ検証用にsetTimeoutループへ切替
const headlessMode = new URLSearchParams(location.search).has("headless");

new Phaser.Game({
  type: headlessMode ? Phaser.CANVAS : Phaser.AUTO,
  parent: "game",
  width: STAGE_W,
  height: STAGE_H,
  fps: headlessMode ? { forceSetTimeOut: true, target: 30 } : undefined,
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: DEFAULT_PARAMS.environment.gravity } },
  },
  scene,
});

hud.apply(store.params.ui, store.params.meta);
beat.setParams(store.params.environment.bgm.genre, store.params.environment.bgm.bpm);

// AudioContext はユーザー操作後でないと起動できない
window.addEventListener("pointerdown", () => beat.start(), { once: true });
window.addEventListener("keydown", () => beat.start(), { once: true });

// ---- 入力シミュレーション（Step 3 でスマホ+WS、Step 4 でAI翻訳に置き換わる） ----

const sessionLog: string[] = [];

function simulate(id: string): void {
  const d = DEMO_INPUTS.find((x) => x.id === id);
  if (!d) return;
  sessionLog.push(...d.translationLog.map((l) => buildLogLine(d.sourceText, l)));
  store.patch(d.patch, metaOf(d));
}

// ビルドログ: セッション中の翻訳記録 + 現在のパラメータのダイジェスト
function buildLines(): string[] {
  const p = store.params;
  return [
    "── PARTY LEVEL ARCHITECT BUILD ──",
    ...sessionLog,
    `palette: "${p.environment.palette}"`,
    `backdrop: "${p.environment.backdrop}"`,
    `bgm: "${p.environment.bgm.genre}" @ ${p.environment.bgm.bpm}bpm`,
    `scrollSpeed: ${p.environment.scrollSpeed}`,
    `gravity: ${p.environment.gravity}`,
    `enemies: ${p.enemies.length} archetype(s) loaded`,
    `gimmicks: ${p.gimmicks.length} placed`,
    `ui.theme: "${p.ui.theme}"`,
    `particles: "${p.ui.particles.type}" density ${p.ui.particles.density}`,
    "linking bgm tempo to world heartbeat...",
    "compiling crowd excitement...",
    "WORLD READY.",
  ];
}

function runBuild(): void {
  scene.playBuildSequence(buildLines(), store.params.meta.title);
}

createDebugPanel(store, {
  playFinale: () => scene.playFinale(store.params.ui.finale.style, store.params.ui.finale.intensity),
  setBgmEnabled: (on) => {
    bgmOn = on;
    beat.setMuted(!on);
  },
  applyPartyPreset: () => store.patch(PARTY_PRESET),
  simulate,
  runBuild,
});

// ハッシュフック（デモ・自動検証用）:
//   #party            … 完成形プリセットを即適用
//   #demo-materialize … 入力シミュレーションを連続再生
//   #demo-build       … 入力3件 → ビルドシーケンスまで通し再生
if (location.hash === "#party") {
  setTimeout(() => store.patch(PARTY_PRESET), 500);
} else if (location.hash === "#demo-materialize") {
  setTimeout(() => {
    simulate("a1");
    simulate("b1");
  }, 800);
} else if (location.hash === "#demo-build") {
  setTimeout(() => {
    store.patch({ meta: { title: "NEON SLIME CARNIVAL" } });
    simulate("a1");
    simulate("b1");
    simulate("c2");
    runBuild();
  }, 800);
}
