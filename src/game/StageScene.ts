import Phaser from "phaser";
import {
  PALETTES,
  type EnemyDef,
  type FinaleStyle,
  type GimmickDef,
  type StageParams,
} from "../params/StageParams";
import type { ParamStore, ParamsPatch } from "../params/ParamStore";
import { CeremonyDirector } from "./CeremonyDirector";

export const STAGE_W = 1280;
export const STAGE_H = 720;
const GROUND_TOP = 660;
const PLAYER_X = 220;
const JUMP_HEIGHT = 190; // 重力が変わっても到達高さが一定になるよう速度を逆算する

interface EnemySprite extends Phaser.Physics.Arcade.Sprite {
  def: EnemyDef;
  baseY: number;
  born: number;
}

export interface StageHooks {
  onScore: (v: number) => void;
  onHp: (v: number) => void;
  onBuildWhiteout: () => void; // ビルドのホワイトアウト=無音開始
  onBuildDrop: () => void;     // タイトル表示と同時にBGM開幕
  onPatchApplied: (patch: ParamsPatch) => void; // HUD/BGM等のシーン外反映（儀式の反映瞬間と同期）
}

export class StageScene extends Phaser.Scene {
  private store: ParamStore;
  private hooks: StageHooks;
  private player!: Phaser.Physics.Arcade.Sprite;
  private groundTile!: Phaser.GameObjects.TileSprite;
  private groundBody!: Phaser.GameObjects.Rectangle;
  private decor!: Phaser.GameObjects.Container;
  private gimmickLayer!: Phaser.GameObjects.Container;
  private fogRect!: Phaser.GameObjects.Rectangle;
  private stars: Phaser.GameObjects.Arc[] = [];
  private lasers: Phaser.GameObjects.Rectangle[] = [];
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private jumpEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambientEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private spawnIndex = 0;
  private score = 0;
  private hp = 3;
  private invulnUntil = 0;
  private ceremony!: CeremonyDirector;
  private autopilot = false;
  private mirrorball: Phaser.GameObjects.Container | null = null;
  private spotlight: Phaser.GameObjects.Arc | null = null;
  private springZone: Phaser.GameObjects.Zone | null = null;

  constructor(store: ParamStore, hooks: StageHooks) {
    super("stage");
    this.store = store;
    this.hooks = hooks;
  }

  create(): void {
    this.makeTextures();
    const p = this.store.params;

    // 背景（パレットでグラデーションを描き直すCanvasTexture）
    this.textures.createCanvas("sky", STAGE_W, STAGE_H);
    this.add.image(0, 0, "sky").setOrigin(0).setDepth(-10);
    this.decor = this.add.container(0, 0).setDepth(-5);

    // 地面: 見た目はTileSprite（スクロール）、当たり判定は静的Rect
    this.groundTile = this.add.tileSprite(STAGE_W / 2, GROUND_TOP + 30, STAGE_W, 60, "groundTex");
    this.groundBody = this.add.rectangle(STAGE_W / 2, GROUND_TOP + 30, STAGE_W, 60).setVisible(false);
    this.physics.add.existing(this.groundBody, true);

    this.player = this.physics.add.sprite(PLAYER_X, GROUND_TOP - 100, "playerTex");
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.groundBody);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemies, this.groundBody);
    this.physics.add.overlap(this.player, this.enemies, () => this.onHit());
    this.physics.add.overlap(this.player, this.bullets, (_pl, b) => {
      (b as Phaser.Physics.Arcade.Sprite).destroy();
      this.onHit();
    });

    this.gimmickLayer = this.add.container(0, 0).setDepth(2);
    this.fogRect = this.add.rectangle(0, 0, STAGE_W, STAGE_H, 0xffffff, 0).setOrigin(0).setDepth(7);

    this.jumpEmitter = this.add.particles(0, 0, "px", { emitting: false }).setDepth(9);
    this.ambientEmitter = this.add.particles(0, 0, "px", { emitting: false }).setDepth(9);

    // 入力: スペース or タップでジャンプ
    this.input.keyboard?.on("keydown-SPACE", () => this.jump());
    this.input.on("pointerdown", () => this.jump());

    this.spawnTimer = this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    this.ceremony = new CeremonyDirector(this, {
      applyPatch: (patch) => this.applyPatch(this.store.params, patch),
      accent: () => this.store.params.ui.accentColor,
      onBuildWhiteout: () => this.hooks.onBuildWhiteout(),
      onBuildDrop: () => this.hooks.onBuildDrop(),
    });

    this.applyAll(p);
    // meta付き（=言葉由来）のパッチは儀式を経て反映、無印（=デバッグスライダー）は即時反映
    this.store.onChange((params, patch, meta) => {
      if (meta) this.ceremony.enqueuePatch(patch, meta);
      else this.applyPatch(params, patch);
    });
  }

  playBuildSequence(lines: string[], title: string, onDone?: () => void): void {
    this.ceremony.enqueueBuild(lines, title, onDone);
  }

  // デモ自動走行（ホストパネルの🤖トグル）: 前方の脅威を見てジャンプする
  setAutopilot(on: boolean): void {
    this.autopilot = on;
  }

  private autopilotTick(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down) return;
    const threats = [
      ...(this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]),
      ...(this.bullets.getChildren() as Phaser.Physics.Arcade.Sprite[]),
    ];
    for (const t of threats) {
      if (!t.active) continue;
      const dx = t.x - this.player.x;
      if (dx > 20 && dx < 260 && t.y > this.player.y - 100) {
        this.jump();
        return;
      }
    }
  }

  // ---- パラメータ → 画面 の変換層（このゲームの心臓） ----

  private applyAll(p: StageParams): void {
    this.applyEnvironment(p);
    this.applyEnemiesConfig();
    this.applyGimmicks(p);
    this.applyUi(p);
  }

  private applyPatch(p: StageParams, patch: ParamsPatch): void {
    if (patch.environment) this.applyEnvironment(p);
    if (patch.enemies) this.applyEnemiesConfig();
    if (patch.gimmicks) this.applyGimmicks(p);
    if (patch.ui) this.applyUi(p);
    this.hooks.onPatchApplied(patch);
  }

  private applyEnvironment(p: StageParams): void {
    const env = p.environment;
    const pal = PALETTES[env.palette];

    const sky = this.textures.get("sky") as Phaser.Textures.CanvasTexture;
    const ctx = sky.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    sky.refresh();

    this.groundTile.setTint(pal.ground);
    this.physics.world.gravity.y = env.gravity;
    this.spawnTimer.reset({
      delay: 2200 / env.scrollSpeed,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    this.buildBackdrop(p);
    this.buildFx(p);
  }

  private buildBackdrop(p: StageParams): void {
    const pal = PALETTES[p.environment.palette];
    this.decor.removeAll(true);
    const add = (go: Phaser.GameObjects.GameObject) => this.decor.add(go);
    const c = pal.decor;

    switch (p.environment.backdrop) {
      case "disco":
        add(this.add.circle(STAGE_W / 2, 90, 46, c));
        for (let i = 0; i < 8; i++)
          add(this.add.rectangle(140 + i * 140, 600, 80, 80, c, 0.25).setAngle(45));
        break;
      case "rooftop":
        for (let i = 0; i < 6; i++) {
          const h = 120 + ((i * 97) % 180);
          add(this.add.rectangle(110 + i * 210, GROUND_TOP - h / 2, 130, h, c, 0.5));
          // 窓明かり
          for (let w = 0; w < 4; w++) {
            add(
              this.add.rectangle(
                80 + i * 210 + (w % 2) * 40,
                GROUND_TOP - h + 40 + Math.floor(w / 2) * 50,
                16,
                20,
                0xfff2a8,
                0.55
              )
            );
          }
        }
        break;
      case "beach":
        add(this.add.circle(STAGE_W - 200, 120, 60, c));
        for (let i = 0; i < 3; i++) {
          // 雲
          add(this.add.ellipse(190 + i * 330, 130 + (i % 2) * 50, 130, 36, 0xffffff, 0.35));
          add(this.add.ellipse(230 + i * 330, 116 + (i % 2) * 50, 90, 30, 0xffffff, 0.3));
        }
        for (let i = 0; i < 5; i++)
          add(this.add.ellipse(160 + i * 240, 560 + (i % 2) * 30, 180, 24, c, 0.4));
        break;
      case "space":
        add(this.add.circle(220, 150, 70, c, 0.8));
        add(this.add.ellipse(220, 150, 220, 40, c, 0.35));
        add(this.add.circle(1020, 110, 30, c, 0.5)); // 第二の月
        add(this.add.circle(1006, 100, 7, 0x000000, 0.2)); // クレーター
        add(this.add.circle(1032, 120, 5, 0x000000, 0.2));
        break;
      case "kitchen":
        add(this.add.rectangle(STAGE_W / 2, 520, 700, 30, c, 0.6));
        add(this.add.rectangle(380, 470, 60, 80, c, 0.5));
        add(this.add.circle(700, 460, 45, c, 0.5));
        break;
      case "street":
        for (let i = 0; i < 4; i++) {
          add(this.add.rectangle(180 + i * 300, GROUND_TOP - 90, 10, 180, c, 0.7));
          add(this.add.circle(180 + i * 300, GROUND_TOP - 185, 16, c));
        }
        break;
    }
  }

  private buildFx(p: StageParams): void {
    const env = p.environment;
    const pal = PALETTES[env.palette];

    this.fogRect.setFillStyle(0xffffff, env.backdropFx.fog * 0.3);

    for (const s of this.stars) s.destroy();
    this.stars = [];
    const starCount = Math.round(env.backdropFx.stars * 40);
    for (let i = 0; i < starCount; i++) {
      const star = this.add
        .circle(Math.random() * STAGE_W, Math.random() * 380, 1.5 + Math.random() * 2, pal.fxTint)
        .setDepth(-4);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 1 },
        duration: 600 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
      });
      this.stars.push(star);
    }

    for (const l of this.lasers) l.destroy();
    this.lasers = [];
    const laserCount = Math.round(env.backdropFx.lasers * 6);
    for (let i = 0; i < laserCount; i++) {
      const laser = this.add
        .rectangle(STAGE_W / 2, 0, 5, STAGE_H * 1.6, pal.fxTint, 0.3)
        .setOrigin(0.5, 0)
        .setDepth(-3)
        .setAngle((360 / laserCount) * i);
      this.lasers.push(laser);
    }
  }

  private applyEnemiesConfig(): void {
    // テンプレートが変わったら既存個体を一掃して見た目の整合を取る
    this.enemies.clear(true, true);
    this.bullets.clear(true, true);
    this.spawnIndex = 0;
  }

  private applyGimmicks(p: StageParams): void {
    this.gimmickLayer.removeAll(true);
    this.mirrorball = null;
    this.spotlight = null;
    this.springZone?.destroy();
    this.springZone = null;

    for (const g of p.gimmicks) this.buildGimmick(g, p);
  }

  private buildGimmick(g: GimmickDef, p: StageParams): void {
    const accent = colorOf(p.ui.accentColor);
    const x = g.pos.x * STAGE_W;
    const y = g.pos.y * STAGE_H;

    switch (g.kind) {
      case "mirrorball": {
        const ball = this.add.container(x, y);
        ball.add(this.add.circle(0, 0, 36, 0xdddddd));
        for (let i = 0; i < 4; i++) {
          ball.add(
            this.add.rectangle(0, 0, 4, 500, accent, 0.25).setOrigin(0.5, 0).setAngle(i * 90 + 30)
          );
        }
        ball.setData("speed", g.params.rotationSpeed ?? 0.6);
        this.gimmickLayer.add(ball);
        this.mirrorball = ball;
        break;
      }
      case "springpad": {
        const pad = this.add.rectangle(x, GROUND_TOP - 8, 90, 16, accent);
        this.gimmickLayer.add(pad);
        this.springZone = this.add.zone(x, GROUND_TOP - 20, 90, 40);
        this.physics.add.existing(this.springZone, true);
        this.physics.add.overlap(this.player, this.springZone, () => {
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          if (body.velocity.y > 50) {
            body.setVelocityY(-this.jumpVelocity() * (g.params.power ?? 1.6));
            this.jumpEmitter.explode(20, this.player.x, this.player.y + 20);
          }
        });
        break;
      }
      case "confettiCannon": {
        const cannon = this.add.rectangle(x, y, 26, 46, accent).setAngle(-30);
        this.gimmickLayer.add(cannon);
        this.time.addEvent({
          delay: (g.params.interval ?? 2.5) * 1000,
          loop: true,
          callback: () => {
            if (cannon.active) this.jumpEmitter.explode(g.params.burst ?? 40, x, y - 30);
          },
        });
        break;
      }
      case "slipFloor": {
        const w = (g.params.width ?? 0.2) * STAGE_W;
        this.gimmickLayer.add(
          this.add.rectangle(x, GROUND_TOP + 8, w, 14, accent, 0.55)
        );
        break;
      }
      case "spotlight": {
        this.spotlight = this.add.circle(x, y, g.params.radius ?? 140, 0xffffff, 0.12);
        this.gimmickLayer.add(this.spotlight);
        break;
      }
    }
  }

  private applyUi(p: StageParams): void {
    const accent = colorOf(p.ui.accentColor);
    const density = p.ui.particles.density;
    const type = p.ui.particles.type;

    const tints: Record<string, number[]> = {
      confetti: [0xff2a6d, 0xffd700, 0x05d9e8, 0x7cfc00],
      sparkle: [0xffffff, 0xfff5ba, accent],
      bubbles: [0x90e0ef, 0xcaf0f8],
      petals: [0xffacc7, 0xffd6e8],
      pixels: [accent],
    };

    this.jumpEmitter.setConfig({
      emitting: false,
      speed: { min: 80, max: 260 },
      angle: { min: 200, max: 340 },
      gravityY: type === "bubbles" ? -200 : 400,
      scale: { start: type === "sparkle" ? 0.5 : 1.2, end: 0 },
      lifespan: 900,
      rotate: type === "confetti" || type === "petals" ? { min: 0, max: 360 } : 0,
      tint: tints[type],
    });

    this.ambientEmitter.setConfig({
      emitting: density > 0.05,
      x: { min: 0, max: STAGE_W },
      y: type === "bubbles" ? STAGE_H : -10,
      speedY: type === "bubbles" ? { min: -90, max: -40 } : { min: 40, max: 120 },
      speedX: { min: -30, max: 30 },
      frequency: 400 / Math.max(density, 0.05),
      scale: { start: 0.8, end: 0.2 },
      lifespan: 6000,
      rotate: { min: 0, max: 360 },
      tint: tints[type],
    });
  }

  // ---- ゲームループ ----

  update(time: number, delta: number): void {
    const p = this.store.params;
    const dt = delta / 1000;
    const scroll = p.environment.scrollSpeed;

    this.groundTile.tilePositionX += 240 * scroll * dt;
    if (this.autopilot) this.autopilotTick();

    // BPMに同期した世界の鼓動（テンポが世界の物理を変える、の最小実装）
    const pulse = 1 + 0.05 * Math.sin((time / 1000) * (p.environment.bgm.bpm / 60) * Math.PI * 2);

    for (const obj of this.enemies.getChildren() as EnemySprite[]) {
      this.updateEnemy(obj, time, pulse, scroll);
    }

    for (const b of this.bullets.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (b.x < -60) b.destroy();
    }

    if (this.mirrorball) {
      this.mirrorball.angle += (this.mirrorball.getData("speed") as number) * 60 * dt;
      this.mirrorball.setScale(pulse);
    }
    if (this.spotlight) {
      this.spotlight.x = Phaser.Math.Linear(this.spotlight.x, this.player.x, 0.05);
      this.spotlight.y = Phaser.Math.Linear(this.spotlight.y, this.player.y, 0.05);
    }
    for (const l of this.lasers) l.angle += 20 * dt;

    this.score += 10 * scroll * dt;
    this.hooks.onScore(Math.floor(this.score));

    if (time < this.invulnUntil) {
      this.player.setAlpha(Math.sin(time / 40) > 0 ? 0.3 : 1);
    } else {
      this.player.setAlpha(1);
    }
  }

  private updateEnemy(e: EnemySprite, time: number, pulse: number, scroll: number): void {
    if (!e.active) return;
    if (e.x < -80) {
      e.destroy();
      return;
    }
    const b = e.body as Phaser.Physics.Arcade.Body;
    const def = e.def;
    const vx = -def.behavior.moveSpeed * scroll;

    switch (def.archetype) {
      case "blob":
        b.setVelocityX(vx);
        if (b.blocked.down) b.setVelocityY(-def.behavior.jumpPower);
        break;
      case "spinner":
        e.angle += 6;
        b.setVelocityX(vx);
        break;
      case "chaser": {
        const ax = this.player.x - e.x;
        b.setVelocityX(Phaser.Math.Clamp(ax * def.behavior.aggression * 2, -400, 80) + vx * 0.4);
        if (b.blocked.down && this.player.y < e.y - 40 && Math.random() < def.behavior.aggression * 0.05)
          b.setVelocityY(-def.behavior.jumpPower);
        break;
      }
      case "floater":
        b.setVelocityX(vx);
        e.y = e.baseY + Math.sin((time - e.born) / 400) * 46;
        break;
      case "shooter":
        b.setVelocityX(e.x > STAGE_W - 140 ? vx : 0);
        if (time - (e.getData("lastShot") ?? 0) > 2400 / Math.max(def.behavior.aggression, 0.1)) {
          e.setData("lastShot", time);
          const bullet = this.bullets.create(e.x - 30, e.y, "ballTex") as Phaser.Physics.Arcade.Sprite;
          bullet.setScale(0.4).setTint(colorOf(def.skin.tint));
          (bullet.body as Phaser.Physics.Arcade.Body).setVelocityX(-def.behavior.moveSpeed * 2);
        }
        break;
    }
    e.setScale(def.skin.scale * pulse);
  }

  private spawnEnemy(): void {
    const defs = this.store.params.enemies;
    if (defs.length === 0 || this.enemies.countActive() >= defs.length + 3) return;
    const def = defs[this.spawnIndex % defs.length];
    this.spawnIndex++;

    const floats = def.archetype === "floater" || def.archetype === "spinner";
    const y = floats ? 300 + Math.random() * 200 : GROUND_TOP - 60;
    const e = this.enemies.create(STAGE_W + 60, y, `skin-${def.skin.base}`) as EnemySprite;
    e.def = def;
    e.baseY = y;
    e.born = this.time.now;
    e.setTint(colorOf(def.skin.tint));
    e.setScale(def.skin.scale);
    e.setBounce(def.behavior.bounce);
    (e.body as Phaser.Physics.Arcade.Body).setAllowGravity(!floats);
  }

  private jumpVelocity(): number {
    return Math.sqrt(2 * this.physics.world.gravity.y * JUMP_HEIGHT);
  }

  private jump(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      body.setVelocityY(-this.jumpVelocity());
      this.jumpEmitter.explode(
        Math.round(8 + this.store.params.ui.particles.density * 24),
        this.player.x,
        this.player.y + 24
      );
    }
  }

  private onHit(): void {
    if (this.time.now < this.invulnUntil) return;
    this.invulnUntil = this.time.now + 1200;
    this.cameras.main.shake(150, 0.01);
    this.hp--;
    if (this.hp <= 0) {
      this.hp = 3;
      this.score = 0;
    }
    this.hooks.onHp(this.hp);
  }

  // フィナーレ演出（デバッグパネルの「Play Finale」から起動）
  playFinale(style: FinaleStyle, intensity: number): void {
    const n = Math.round(3 + intensity * 7);
    if (style === "fireworks") {
      for (let i = 0; i < n; i++) {
        this.time.delayedCall(i * 220, () =>
          this.jumpEmitter.explode(50, 150 + Math.random() * (STAGE_W - 300), 100 + Math.random() * 300)
        );
      }
    } else if (style === "discoDrop") {
      this.cameras.main.flash(400, 255, 255, 255);
      for (let i = 0; i < n * 2; i++) {
        this.time.delayedCall(i * 120, () =>
          this.jumpEmitter.explode(30, Math.random() * STAGE_W, -10)
        );
      }
    } else {
      const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
      colors.forEach((c, i) => {
        this.time.delayedCall(i * 100, () => {
          const wave = this.add.rectangle(-100, STAGE_H / 2, 120, STAGE_H, c, 0.25).setDepth(9);
          this.tweens.add({
            targets: wave,
            x: STAGE_W + 100,
            duration: 900,
            onComplete: () => wave.destroy(),
          });
        });
      });
      this.time.delayedCall(700, () => this.jumpEmitter.explode(80, STAGE_W / 2, STAGE_H / 2));
    }
  }

  // 白ベースのプレースホルダ図形（tintで着色するためすべて白で描く）
  private makeTextures(): void {
    const g = this.add.graphics();
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      g.fillStyle(0xffffff);
      draw();
      g.generateTexture(key, w, h);
    };

    tex("px", 8, 8, () => g.fillRect(0, 0, 8, 8));
    tex("playerTex", 44, 60, () => {
      g.fillRoundedRect(0, 0, 44, 60, 10);
      g.fillStyle(0x222244, 0.85); // バイザー
      g.fillRoundedRect(20, 10, 20, 14, 6);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(24, 13, 6, 3);
    });
    tex("groundTex", 64, 60, () => {
      g.fillRect(0, 0, 64, 60);
      g.fillStyle(0x000000, 0.15);
      g.fillRect(0, 0, 32, 8);
    });
    tex("ballTex", 48, 48, () => g.fillCircle(24, 24, 24));
    tex("skin-slime", 56, 44, () => {
      g.fillEllipse(28, 28, 56, 32);
      g.fillCircle(28, 16, 16);
      g.fillStyle(0x000000, 0.45); // つぶらな瞳
      g.fillCircle(21, 16, 4);
      g.fillCircle(35, 16, 4);
      g.fillStyle(0xffffff, 0.6); // ぷるぷるハイライト
      g.fillEllipse(18, 8, 10, 6);
    });
    tex("skin-ball", 52, 52, () => {
      g.fillCircle(26, 26, 26);
      g.fillStyle(0x000000, 0.18); // ミラーボール格子
      g.fillRect(0, 16, 52, 3);
      g.fillRect(0, 33, 52, 3);
      g.fillRect(16, 0, 3, 52);
      g.fillRect(33, 0, 3, 52);
      g.fillStyle(0xffffff, 0.7);
      g.fillEllipse(17, 13, 12, 8);
    });
    tex("skin-ghost", 52, 60, () => {
      g.fillCircle(26, 24, 24);
      g.fillRect(2, 24, 48, 24);
      // すその波
      g.fillCircle(10, 48, 8);
      g.fillCircle(26, 50, 8);
      g.fillCircle(42, 48, 8);
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(18, 20, 5);
      g.fillCircle(34, 20, 5);
      g.fillEllipse(26, 32, 8, 5); // あいた口
    });
    tex("skin-bottle", 32, 64, () => {
      g.fillRoundedRect(0, 16, 32, 48, 6);
      g.fillRect(10, 0, 12, 20);
      g.fillStyle(0xffffff, 0.4); // ラベル
      g.fillRect(4, 32, 24, 14);
      g.fillStyle(0x000000, 0.4);
      g.fillCircle(11, 25, 3);
      g.fillCircle(21, 25, 3);
    });
    tex("skin-cake", 56, 48, () => {
      g.fillRect(0, 20, 56, 28);
      g.fillEllipse(28, 20, 56, 16);
      g.fillRect(25, 0, 6, 14);
      g.fillStyle(0xffffff, 0.55); // クリームのしずく
      g.fillCircle(10, 26, 5);
      g.fillCircle(28, 29, 5);
      g.fillCircle(46, 26, 5);
      g.fillStyle(0x000000, 0.4);
      g.fillCircle(19, 36, 3);
      g.fillCircle(37, 36, 3);
    });
    g.destroy();
  }
}

function colorOf(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}
