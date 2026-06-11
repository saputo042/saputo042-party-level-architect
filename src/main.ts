import Phaser from "phaser";
import { DEFAULT_PARAMS, PARTY_PRESET } from "./params/StageParams";
import { ParamStore } from "./params/ParamStore";
import { StageScene, STAGE_H, STAGE_W } from "./game/StageScene";
import { BeatEngine } from "./game/audio";
import { Hud } from "./ui/hud";
import { createDebugPanel } from "./debug/panel";

const store = new ParamStore(DEFAULT_PARAMS);
const beat = new BeatEngine();
const hud = new Hud(document.getElementById("hud")!);
const scene = new StageScene(store, {
  onScore: (v) => hud.setScore(v),
  onHp: (v) => hud.setHp(v),
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: STAGE_W,
  height: STAGE_H,
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: DEFAULT_PARAMS.environment.gravity } },
  },
  scene,
});

hud.apply(store.params.ui, store.params.meta);
beat.setParams(store.params.environment.bgm.genre, store.params.environment.bgm.bpm);

store.onChange((p, patch) => {
  if (patch.ui || patch.meta) hud.apply(p.ui, p.meta);
  if (patch.environment?.bgm) beat.setParams(p.environment.bgm.genre, p.environment.bgm.bpm);
});

// AudioContext はユーザー操作後でないと起動できない
window.addEventListener("pointerdown", () => beat.start(), { once: true });
window.addEventListener("keydown", () => beat.start(), { once: true });

createDebugPanel(store, {
  playFinale: () => scene.playFinale(store.params.ui.finale.style, store.params.ui.finale.intensity),
  setBgmEnabled: (on) => beat.setMuted(!on),
  applyPartyPreset: () => store.patch(PARTY_PRESET),
});

// #party でパーティプリセット起動（デモ・検証用）。シーン初期化後に適用する
if (location.hash === "#party") {
  setTimeout(() => store.patch(PARTY_PRESET), 500);
}
