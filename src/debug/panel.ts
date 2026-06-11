import GUI from "lil-gui";
import {
  buildEnemies,
  GIMMICK_PRESETS,
  type EnemyArchetype,
  type EnemySkinBase,
  type GimmickKind,
  type StageParams,
} from "../params/StageParams";
import type { ParamStore } from "../params/ParamStore";

// デバッグパネル — Step 3 以降でスマホ入力+AI翻訳に置き換わる「手動の翻訳者」。
// パネルの全操作は store.patch() に集約され、ゲーム側はパッチの出所を知らない。

export interface PanelActions {
  playFinale: () => void;
  setBgmEnabled: (on: boolean) => void;
  applyPartyPreset: () => void;
}

export function createDebugPanel(store: ParamStore, actions: PanelActions): GUI {
  const gui = new GUI({ title: "StageParams Debug" });
  const p = store.params;

  gui.add({ party: actions.applyPartyPreset }, "party").name("🎉 Party Preset");

  // --- Environment ---
  const env = gui.addFolder("Environment（プレイヤーA: 環境とテンポ）");
  env.add(p.environment, "palette", ["neon", "pastel", "midnight", "tropical", "retro", "monochrome"])
    .onChange((v: string) => store.patch({ environment: { palette: v as StageParams["environment"]["palette"] } }));
  env.add(p.environment, "backdrop", ["disco", "rooftop", "beach", "space", "kitchen", "street"])
    .onChange((v: string) => store.patch({ environment: { backdrop: v as StageParams["environment"]["backdrop"] } }));
  env.add(p.environment.backdropFx, "fog", 0, 1, 0.05)
    .onChange((v: number) => store.patch({ environment: { backdropFx: { fog: v } } }));
  env.add(p.environment.backdropFx, "stars", 0, 1, 0.05)
    .onChange((v: number) => store.patch({ environment: { backdropFx: { stars: v } } }));
  env.add(p.environment.backdropFx, "lasers", 0, 1, 0.05)
    .onChange((v: number) => store.patch({ environment: { backdropFx: { lasers: v } } }));
  env.add(p.environment.bgm, "genre", ["edm", "funk", "jazz", "rock", "lofi", "8bit"])
    .onChange((v: string) => store.patch({ environment: { bgm: { genre: v as StageParams["environment"]["bgm"]["genre"] } } }));
  env.add(p.environment.bgm, "bpm", 80, 180, 1)
    .onChange((v: number) => store.patch({ environment: { bgm: { bpm: v } } }));
  env.add(p.environment, "scrollSpeed", 0.5, 2.0, 0.05)
    .onChange((v: number) => store.patch({ environment: { scrollSpeed: v } }));
  env.add(p.environment, "gravity", 600, 1400, 10)
    .onChange((v: number) => store.patch({ environment: { gravity: v } }));

  const audioCtl = { bgmOn: true };
  env.add(audioCtl, "bgmOn").name("BGM ON").onChange((v: boolean) => actions.setBgmEnabled(v));

  // --- Enemies（テンプレート × 数で enemies[] を生成） ---
  const first = p.enemies[0];
  const enemyView = {
    count: p.enemies.length,
    archetype: first.archetype as EnemyArchetype,
    base: first.skin.base as EnemySkinBase,
    tint: first.skin.tint,
    scale: first.skin.scale,
    moveSpeed: first.behavior.moveSpeed,
    bounce: first.behavior.bounce,
    jumpPower: first.behavior.jumpPower,
    aggression: first.behavior.aggression,
  };
  const pushEnemies = () =>
    store.patch({
      enemies: buildEnemies(
        {
          archetype: enemyView.archetype,
          skin: { base: enemyView.base, tint: enemyView.tint, scale: enemyView.scale },
          behavior: {
            moveSpeed: enemyView.moveSpeed,
            bounce: enemyView.bounce,
            jumpPower: enemyView.jumpPower,
            aggression: enemyView.aggression,
          },
        },
        enemyView.count
      ),
    });

  const ene = gui.addFolder("Enemies（プレイヤーB: 敵とギミック）");
  ene.add(enemyView, "count", 1, 8, 1).onChange(pushEnemies);
  ene.add(enemyView, "archetype", ["blob", "spinner", "chaser", "floater", "shooter"]).onChange(pushEnemies);
  ene.add(enemyView, "base", ["slime", "ball", "ghost", "bottle", "cake"]).onChange(pushEnemies);
  ene.addColor(enemyView, "tint").onChange(pushEnemies);
  ene.add(enemyView, "scale", 0.5, 2.5, 0.1).onChange(pushEnemies);
  ene.add(enemyView, "moveSpeed", 40, 400, 5).onChange(pushEnemies);
  ene.add(enemyView, "bounce", 0, 1, 0.05).onChange(pushEnemies);
  ene.add(enemyView, "jumpPower", 100, 800, 10).onChange(pushEnemies);
  ene.add(enemyView, "aggression", 0, 1, 0.05).onChange(pushEnemies);

  // --- Gimmicks（プリセット位置にON/OFF。本番はスタンプ配置座標が入る） ---
  const gimmickView: Record<GimmickKind, boolean> = {
    mirrorball: false,
    springpad: false,
    confettiCannon: false,
    slipFloor: false,
    spotlight: false,
  };
  const pushGimmicks = () =>
    store.patch({
      gimmicks: (Object.keys(gimmickView) as GimmickKind[])
        .filter((k) => gimmickView[k])
        .map((k) => structuredClone(GIMMICK_PRESETS[k])),
    });

  const gim = gui.addFolder("Gimmicks");
  for (const kind of Object.keys(gimmickView) as GimmickKind[]) {
    gim.add(gimmickView, kind).onChange(pushGimmicks);
  }

  // --- UI & Effects ---
  const ui = gui.addFolder("UI & Effects（プレイヤーC: UIとエフェクト）");
  ui.add(p.ui, "theme", ["popart", "cyber", "handdrawn", "luxury", "kawaii"])
    .onChange((v: string) => store.patch({ ui: { theme: v as StageParams["ui"]["theme"] } }));
  ui.addColor(p.ui, "accentColor")
    .onChange((v: string) => store.patch({ ui: { accentColor: v } }));
  ui.add(p.ui.particles, "type", ["confetti", "sparkle", "bubbles", "petals", "pixels"])
    .onChange((v: string) => store.patch({ ui: { particles: { type: v as StageParams["ui"]["particles"]["type"] } } }));
  ui.add(p.ui.particles, "density", 0, 1, 0.05)
    .onChange((v: number) => store.patch({ ui: { particles: { density: v } } }));
  ui.add(p.ui.finale, "style", ["fireworks", "discoDrop", "rainbowWave"])
    .onChange((v: string) => store.patch({ ui: { finale: { style: v as StageParams["ui"]["finale"]["style"] } } }));
  ui.add(p.ui.finale, "intensity", 0, 1, 0.05)
    .onChange((v: number) => store.patch({ ui: { finale: { intensity: v } } }));
  ui.add({ playFinale: actions.playFinale }, "playFinale").name("▶ Play Finale");

  // --- Meta ---
  const meta = gui.addFolder("Meta");
  meta.add(p.meta, "title").onChange((v: string) => store.patch({ meta: { title: v } }));

  return gui;
}
