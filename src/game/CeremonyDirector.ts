import Phaser from "phaser";
import type { ParamsPatch, PatchMeta } from "../params/ParamStore";
import { STAGE_H, STAGE_W } from "./StageScene";

// CeremonyDirector — 「言葉が世界になる瞬間」を儀式化する演出装置（設計書 1.2 Phase 2 / Phase 3）。
//
// マテリアライズ: ①光の粒が飛来 → ②入力文言がパラメータに分解されるログ → ③波紋と共に反映 + 名前タグ
// ビルド: 世界が暗転 → 翻訳ログ高速流し + プログレスバー → ホワイトアウト → 無音 → タイトル → BGM開幕
//
// パッチの実適用は③「反映」の瞬間まで遅延させる。視覚の変化と儀式のクライマックスを一致させるため。

export interface CeremonyHooks {
  applyPatch: (patch: ParamsPatch) => void;
  accent: () => string; // '#rrggbb'
  onBuildWhiteout: () => void; // 無音開始（BGMミュート）
  onBuildDrop: () => void;     // タイトル表示と同時にBGM開幕
}

type QueueItem =
  | { kind: "patch"; patch: ParamsPatch; meta: PatchMeta }
  | { kind: "build"; lines: string[]; title: string };

const LOG_COLOR = "#7cfc00";
const MAX_LOG_LINES = 5;

export class CeremonyDirector {
  private scene: Phaser.Scene;
  private hooks: CeremonyHooks;
  private queue: QueueItem[] = [];
  private busy = false;

  constructor(scene: Phaser.Scene, hooks: CeremonyHooks) {
    this.scene = scene;
    this.hooks = hooks;
  }

  enqueuePatch(patch: ParamsPatch, meta: PatchMeta): void {
    this.queue.push({ kind: "patch", patch, meta });
    this.next();
  }

  enqueueBuild(lines: string[], title: string): void {
    this.queue.push({ kind: "build", lines, title });
    this.next();
  }

  private next(): void {
    if (this.busy) return;
    const item = this.queue.shift();
    if (!item) return;
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.next();
    };
    if (item.kind === "patch") this.playMaterialize(item.patch, item.meta, done);
    else this.playBuild(item.lines, item.title, done);
  }

  // ---- マテリアライズ演出 ----

  private playMaterialize(patch: ParamsPatch, meta: PatchMeta, done: () => void): void {
    const s = this.scene;
    const target = this.targetFor(patch);
    const accent = this.accentNum();

    // ① 画面端から光の粒が飛来
    for (let i = 0; i < 16; i++) {
      const edge = this.randomEdgePoint();
      const dot = s.add.image(edge.x, edge.y, "px").setTint(accent).setScale(2).setDepth(20);
      s.tweens.add({
        targets: dot,
        x: target.x + Phaser.Math.Between(-14, 14),
        y: target.y + Phaser.Math.Between(-14, 14),
        scale: 0.5,
        delay: i * 28,
        duration: 520,
        ease: "Cubic.easeIn",
        onComplete: () => dot.destroy(),
      });
    }
    s.time.delayedCall(620, () => {
      const swirl = s.add.particles(target.x, target.y, "px", {
        speed: { min: 50, max: 150 },
        scale: { start: 0.9, end: 0 },
        lifespan: 600,
        tint: accent,
        emitting: false,
      }).setDepth(20);
      swirl.explode(24);
      s.time.delayedCall(900, () => swirl.destroy());
    });

    // ② 入力された言葉 → パラメータへ分解されるログ
    const srcText = s.add
      .text(target.x, target.y - 16, `「${meta.sourceText}」`, {
        fontFamily: "sans-serif",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setScale(0);
    s.tweens.add({ targets: srcText, scale: 1, delay: 560, duration: 320, ease: "Back.easeOut" });

    const lines = meta.translationLog.slice(0, MAX_LOG_LINES);
    const logTexts: Phaser.GameObjects.Text[] = [];
    lines.forEach((line, i) => {
      const t = s.add
        .text(target.x, target.y + 28 + i * 24, line, {
          fontFamily: "Consolas, monospace",
          fontSize: "17px",
          color: LOG_COLOR,
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(21)
        .setAlpha(0);
      s.tweens.add({ targets: t, alpha: 1, delay: 950 + i * 280, duration: 160 });
      logTexts.push(t);
    });

    // ③ 反映: 波紋 + 実際のパッチ適用 + 名前タグ
    const reflectAt = 950 + lines.length * 280 + 250;
    s.time.delayedCall(reflectAt, () => {
      this.hooks.applyPatch(patch);
      this.ripple(target.x, target.y, accent);

      const tag = s.add
        .text(target.x, target.y + 28 + lines.length * 24 + 16, `by ${meta.author}`, {
          fontFamily: "sans-serif",
          fontSize: "18px",
          fontStyle: "bold",
          color: this.hooks.accent(),
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(21)
        .setAlpha(0);
      s.tweens.add({ targets: tag, alpha: 1, duration: 200 });
      s.tweens.add({
        targets: tag,
        y: tag.y - 24,
        alpha: 0,
        delay: 2600,
        duration: 400,
        onComplete: () => tag.destroy(),
      });

      s.tweens.add({
        targets: [srcText, ...logTexts],
        alpha: 0,
        delay: 650,
        duration: 350,
        onComplete: () => {
          srcText.destroy();
          for (const t of logTexts) t.destroy();
        },
      });
    });

    s.time.delayedCall(reflectAt + 1100, done);
  }

  private ripple(x: number, y: number, color: number): void {
    const s = this.scene;
    for (let i = 0; i < 3; i++) {
      const ring = s.add.circle(x, y, 24).setStrokeStyle(4 - i, color, 0.8).setDepth(19);
      s.tweens.add({
        targets: ring,
        scale: 9 + i * 4,
        alpha: 0,
        delay: i * 120,
        duration: 700,
        ease: "Cubic.easeOut",
        onComplete: () => ring.destroy(),
      });
    }
  }

  // パッチの種類ごとに「世界のどこが変わるか」へ視線誘導する
  private targetFor(patch: ParamsPatch): { x: number; y: number } {
    if (patch.gimmicks?.length) {
      const g = patch.gimmicks[0]!;
      if (g.pos) return { x: g.pos.x! * STAGE_W, y: Math.max(g.pos.y! * STAGE_H, 140) };
    }
    if (patch.enemies) return { x: 950, y: 420 };
    if (patch.ui) return { x: 640, y: 150 };
    return { x: 640, y: 280 }; // environment / meta
  }

  private randomEdgePoint(): { x: number; y: number } {
    const side = Phaser.Math.Between(0, 3);
    if (side === 0) return { x: Math.random() * STAGE_W, y: -10 };
    if (side === 1) return { x: STAGE_W + 10, y: Math.random() * STAGE_H };
    if (side === 2) return { x: Math.random() * STAGE_W, y: STAGE_H + 10 };
    return { x: -10, y: Math.random() * STAGE_H };
  }

  // ---- ビルドシーケンス ----

  private playBuild(lines: string[], title: string, done: () => void): void {
    const s = this.scene;
    const accent = this.accentNum();

    // 世界が光の粒子に分解 → 暗転
    const overlay = s.add.rectangle(0, 0, STAGE_W, STAGE_H, 0x05060a, 0).setOrigin(0).setDepth(30);
    s.tweens.add({ targets: overlay, fillAlpha: 0.85, duration: 450 });
    const burst = s.add.particles(0, 0, "px", {
      speed: { min: 80, max: 260 },
      scale: { start: 1.2, end: 0 },
      lifespan: 700,
      tint: [accent, 0xffffff],
      emitting: false,
    }).setDepth(31);
    for (let i = 0; i < 10; i++) {
      s.time.delayedCall(i * 70, () =>
        burst.explode(18, Math.random() * STAGE_W, Math.random() * STAGE_H)
      );
    }

    // 翻訳ログ高速流し + プログレスバー
    const STEP = 95;
    const logObjs: Phaser.GameObjects.Text[] = [];
    const barBg = s.add.rectangle(STAGE_W / 2, 642, 720, 8, 0x222933).setDepth(32).setAlpha(0);
    const barFill = s.add
      .rectangle(STAGE_W / 2 - 360, 642, 1, 8, accent)
      .setOrigin(0, 0.5)
      .setDepth(33);
    const pctText = s.add
      .text(STAGE_W / 2, 614, "BUILDING WORLD... 0%", {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(33);
    s.tweens.add({ targets: barBg, alpha: 1, delay: 350, duration: 200 });

    lines.forEach((line, i) => {
      s.time.delayedCall(500 + i * STEP, () => {
        for (const t of logObjs) t.y -= 24;
        const txt = s.add
          .text(120, 560, line, {
            fontFamily: "Consolas, monospace",
            fontSize: "15px",
            color: i % 3 === 0 ? "#ffffff" : LOG_COLOR,
          })
          .setDepth(32);
        logObjs.push(txt);
        while (logObjs.length > 16) logObjs.shift()!.destroy();
        const pct = Math.round(((i + 1) / lines.length) * 100);
        pctText.setText(`BUILDING WORLD... ${pct}%`);
        barFill.width = 720 * ((i + 1) / lines.length);
      });
    });

    // 100% → ホワイトアウト → 無音0.5秒 → タイトル + BGM開幕
    const buildEnd = 500 + lines.length * STEP + 350;
    s.time.delayedCall(buildEnd, () => {
      this.hooks.onBuildWhiteout();
      const white = s.add.rectangle(0, 0, STAGE_W, STAGE_H, 0xffffff, 0).setOrigin(0).setDepth(40);
      s.tweens.add({ targets: white, fillAlpha: 1, duration: 200 });

      s.time.delayedCall(250, () => {
        for (const t of logObjs) t.destroy();
        barBg.destroy();
        barFill.destroy();
        pctText.destroy();
        overlay.destroy();
      });

      // 息を呑む無音の0.5秒
      s.time.delayedCall(750, () => {
        this.hooks.onBuildDrop();
        const titleText = s.add
          .text(STAGE_W / 2, STAGE_H / 2 - 20, title, {
            fontFamily: "sans-serif",
            fontSize: "72px",
            fontStyle: "bold",
            color: this.hooks.accent(),
            stroke: "#000000",
            strokeThickness: 8,
          })
          .setOrigin(0.5)
          .setDepth(41)
          .setScale(2.6)
          .setAlpha(0);
        s.tweens.add({ targets: titleText, scale: 1, alpha: 1, duration: 550, ease: "Back.easeOut" });
        s.tweens.add({ targets: white, fillAlpha: 0, delay: 450, duration: 700, onComplete: () => white.destroy() });
        s.time.delayedCall(600, () => {
          burst.explode(120, STAGE_W / 2, STAGE_H / 2);
          s.cameras.main.shake(250, 0.006);
        });
        s.tweens.add({
          targets: titleText,
          alpha: 0,
          y: titleText.y - 40,
          delay: 2400,
          duration: 500,
          onComplete: () => {
            titleText.destroy();
            burst.destroy();
          },
        });
        s.time.delayedCall(3000, done);
      });
    });
  }

  private accentNum(): number {
    return Phaser.Display.Color.HexStringToColor(this.hooks.accent()).color;
  }
}
