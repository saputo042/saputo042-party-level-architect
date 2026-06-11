var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// shared/protocol.ts
var BUILD_CHARGE_MS = 1500;

// shared/prompts.ts
var PROMPT_CARDS = {
  A: [
    {
      id: "a1",
      title: "\u3053\u306E\u4E16\u754C\u306E\u821E\u53F0\u306F\u3069\u3093\u306A\u5834\u6240\uFF1F",
      hint: "\u4F8B: \u30CD\u30AA\u30F3\u8F1D\u304F\u30C7\u30A3\u30B9\u30B3 / \u771F\u591C\u4E2D\u306E\u5C4B\u4E0A / \u5357\u56FD\u306E\u30D3\u30FC\u30C1",
      kind: "text"
    },
    {
      id: "a2",
      title: "\u3053\u306E\u4E16\u754C\u306B\u6D41\u308C\u308B\u97F3\u697D\u306F\uFF1F",
      hint: "\u4F8B: \u30A2\u30C3\u30D7\u30C6\u30F3\u30DD\u306AEDM / \u3086\u3063\u305F\u308A\u30ED\u30FC\u30D5\u30A1\u30A4 / \u30CE\u30EA\u30CE\u30EA\u306E\u30D5\u30A1\u30F3\u30AF",
      kind: "text"
    },
    {
      id: "a3",
      title: "\u3053\u306E\u30B2\u30FC\u30E0\u306E\u30B9\u30D4\u30FC\u30C9\u611F\u306F\uFF1F",
      hint: "\u4F8B: \u5D50\u307F\u305F\u3044\u306B\u30CF\u30A4\u30B9\u30D4\u30FC\u30C9 / \u304A\u6563\u6B69\u307F\u305F\u3044\u306B\u3086\u3063\u305F\u308A",
      kind: "text"
    }
  ],
  B: [
    {
      id: "b1",
      title: "\u884C\u304F\u624B\u3092\u963B\u3080\u6575\u306F\u3069\u3093\u306A\u59FF\uFF1F",
      hint: "\u4F8B: \u8DF3\u306D\u56DE\u308B\u30B9\u30E9\u30A4\u30E0\u30C9\u30EA\u30F3\u30AF / \u3075\u308F\u3075\u308F\u6F02\u3046\u304A\u3070\u3051\u30B1\u30FC\u30AD",
      kind: "text"
    },
    {
      id: "b2",
      title: "\u305D\u306E\u6575\u306F\u3069\u3046\u52D5\u304F\uFF1F",
      hint: "\u4F8B: \u3074\u3087\u3093\u3074\u3087\u3093\u8DF3\u306D\u308B / \u3050\u308B\u3050\u308B\u56DE\u308B / \u3057\u3064\u3053\u304F\u8FFD\u3044\u304B\u3051\u3066\u304F\u308B",
      kind: "text"
    },
    {
      id: "b3",
      title: "\u30B9\u30C6\u30FC\u30B8\u306B\u30C8\u30E9\u30C3\u30D7\u3092\u4ED5\u639B\u3051\u3088\u3046\uFF01",
      hint: "\u30B9\u30BF\u30F3\u30D7\u3092\u9078\u3093\u3067\u3001\u30DE\u30C3\u30D7\u306E\u7F6E\u304D\u305F\u3044\u5834\u6240\u3092\u30BF\u30C3\u30D7",
      kind: "stamp"
    }
  ],
  C: [
    {
      id: "c1",
      title: "\u30B9\u30B3\u30A2\u3084\u4F53\u529B\u306E\u8868\u793A\u306F\u3069\u3093\u306A\u30C7\u30B6\u30A4\u30F3\uFF1F",
      hint: "\u4F8B: \u30DD\u30C3\u30D7\u30A2\u30FC\u30C8\u98A8 / \u9AD8\u7D1A\u30DB\u30C6\u30EB\u98A8 / \u624B\u66F8\u304D\u98A8 / \u30B5\u30A4\u30D0\u30FC\u98A8",
      kind: "text"
    },
    {
      id: "c2",
      title: "\u30B8\u30E3\u30F3\u30D7\u306E\u77AC\u9593\u3001\u753B\u9762\u306B\u4F55\u304C\u821E\u3046\uFF1F",
      hint: "\u4F8B: \u753B\u9762\u3092\u57CB\u3081\u5C3D\u304F\u3059\u7D19\u5439\u96EA / \u304D\u3089\u304D\u3089\u306E\u661F\u5C51 / \u30B7\u30E3\u30DC\u30F3\u7389",
      kind: "text"
    },
    {
      id: "c3",
      title: "\u30AF\u30EA\u30A2\u306E\u77AC\u9593\u306E\u6700\u9AD8\u306E\u6F14\u51FA\u306F\uFF1F",
      hint: "\u4F8B: \u591C\u7A7A\u3044\u3063\u3071\u3044\u306E\u82B1\u706B / \u8679\u8272\u306E\u6CE2 / \u30C7\u30A3\u30B9\u30B3\u30FB\u30C9\u30ED\u30C3\u30D7",
      kind: "text"
    }
  ]
};

// shared/translate.ts
var PALETTES = [
  [/ネオン|サイバー|蛍光/i, "neon"],
  [/パステル|ゆめかわ|淡い/i, "pastel"],
  [/夜|ミッドナイト|星空/i, "midnight"],
  [/南国|トロピカル|夏|常夏/i, "tropical"],
  [/レトロ|昭和|セピア/i, "retro"],
  [/モノクロ|白黒|無彩色/i, "monochrome"]
];
var BACKDROPS = [
  [/ディスコ|クラブ|ダンスフロア/i, "disco"],
  [/屋上|ビル|ルーフ/i, "rooftop"],
  [/ビーチ|海|砂浜/i, "beach"],
  [/宇宙|スペース|銀河|星/i, "space"],
  [/キッチン|お菓子|パーティ会場|テーブル/i, "kitchen"],
  [/街|ストリート|道/i, "street"]
];
var GENRES = [
  [/EDM|エレクトロ|クラブ|ダンス/i, "edm"],
  [/ファンク|ディスコ|グルーヴ/i, "funk"],
  [/ジャズ|おしゃれ|バー/i, "jazz"],
  [/ロック|バンド|激し/i, "rock"],
  [/lo-?fi|ローファイ|チル|ゆったり|まったり/i, "lofi"],
  [/8bit|ピコピコ|ゲーム音楽|チップ/i, "8bit"]
];
var SKINS = [
  [/スライム|ドリンク|ジュース|ぷるぷる/i, "slime"],
  [/ボール|玉|ミラーボール/i, "ball"],
  [/おばけ|ゴースト|幽霊/i, "ghost"],
  [/ボトル|瓶|シャンパン/i, "bottle"],
  [/ケーキ|スイーツ|お菓子/i, "cake"]
];
var ARCHETYPES = [
  [/跳ね|ぴょん|ジャンプ|バウンド/i, "blob"],
  [/回る|ぐるぐる|回転|スピン/i, "spinner"],
  [/追い|追って|しつこ|迫って/i, "chaser"],
  [/ふわふわ|浮|漂/i, "floater"],
  [/撃|飛ばし|シュート|発射/i, "shooter"]
];
var THEMES = [
  [/ポップ|コミック|アメコミ/i, "popart"],
  [/サイバー|近未来|デジタル/i, "cyber"],
  [/手書き|ゆる|らくがき/i, "handdrawn"],
  [/高級|ラグジュアリー|ホテル|ゴールド/i, "luxury"],
  [/かわい|キュート|ぴんく|ピンク/i, "kawaii"]
];
var PARTICLES = [
  [/紙吹雪|コンフェッティ/i, "confetti"],
  [/きらきら|星|スター/i, "sparkle"],
  [/泡|シャボン|バブル/i, "bubbles"],
  [/花びら|桜|フラワー/i, "petals"],
  [/ドット|ピクセル|四角/i, "pixels"]
];
var FINALES = [
  [/花火|打ち上げ/i, "fireworks"],
  [/ディスコ|ドロップ|爆発/i, "discoDrop"],
  [/虹|レインボー|波/i, "rainbowWave"]
];
var COLOR_WORDS = [
  [/緑|グリーン|抹茶/i, "#7cfc00"],
  [/ピンク|桃/i, "#ff7eb6"],
  [/青|水色|ブルー/i, "#05d9e8"],
  [/赤|レッド|炎/i, "#ff2a6d"],
  [/黄|金|ゴールド/i, "#ffd700"],
  [/紫|パープル/i, "#b14aed"],
  [/白|ホワイト/i, "#f8f9fa"]
];
function hit(dict, text) {
  for (const [re, v] of dict) if (re.test(text)) return v;
  return void 0;
}
__name(hit, "hit");
var FAST = /速|ハイスピード|アップテンポ|嵐|疾走|爆速/;
var SLOW = /ゆっくり|ゆったり|スロー|のんびり|お散歩|まったり/;
var INTENSE = /すごく|めっちゃ|超|最高に|限界|画面を埋め/;
function translateText(promptId, text) {
  const log = [];
  const boost = INTENSE.test(text);
  switch (promptId) {
    case "a1": {
      const palette = hit(PALETTES, text) ?? "neon";
      const backdrop = hit(BACKDROPS, text) ?? "disco";
      log.push(`palette: "${palette}"`, `backdrop: "${backdrop}"`);
      const fx = {};
      if (/星|夜空/.test(text)) fx.stars = 0.8, log.push("backdropFx.stars: 0.8");
      if (/レーザー|光線|ネオン/.test(text)) fx.lasers = 0.5, log.push("backdropFx.lasers: 0.5");
      if (/霧|もや|煙/.test(text)) fx.fog = 0.5, log.push("backdropFx.fog: 0.5");
      return { patch: { environment: { palette, backdrop, backdropFx: fx } }, translationLog: log };
    }
    case "a2": {
      const genre = hit(GENRES, text) ?? "edm";
      const num = text.match(/(\d{2,3})/);
      const bpm = num ? Math.min(180, Math.max(80, parseInt(num[1], 10))) : FAST.test(text) ? 150 : SLOW.test(text) ? 88 : 120;
      log.push(`bgm.genre: "${genre}"`, `bgm.bpm: ${bpm}`);
      return { patch: { environment: { bgm: { genre, bpm } } }, translationLog: log };
    }
    case "a3": {
      const scrollSpeed = FAST.test(text) ? boost ? 1.9 : 1.6 : SLOW.test(text) ? 0.7 : 1.1;
      const gravity = FAST.test(text) ? 1100 : SLOW.test(text) ? 750 : 900;
      log.push(`scrollSpeed: ${scrollSpeed}`, `gravity: ${gravity}`);
      return { patch: { environment: { scrollSpeed, gravity } }, translationLog: log };
    }
    case "b1": {
      const base = hit(SKINS, text) ?? "slime";
      const tint = hit(COLOR_WORDS, text) ?? DEFAULT_TINT[base];
      const scale = /巨大|でか|大きい/.test(text) ? 1.8 : /ちび|小さ|ミニ/.test(text) ? 0.7 : 1.2;
      const archetype = hit(ARCHETYPES, text);
      log.push(`skin.base: "${base}"`, `skin.tint: "${tint}"`, `skin.scale: ${scale}`);
      if (archetype) log.push(`archetype: "${archetype}"`);
      return { enemy: { base, tint, scale, archetype }, translationLog: log };
    }
    case "b2": {
      const archetype = hit(ARCHETYPES, text) ?? "blob";
      const moveSpeed = FAST.test(text) || boost ? 200 : SLOW.test(text) ? 90 : 140;
      const bounce = /跳ね|ぴょん|バウンド/.test(text) ? boost ? 0.95 : 0.8 : 0.3;
      const jumpPower = bounce > 0.5 ? 520 : 360;
      const aggression = /追い|しつこ|迫/.test(text) ? boost ? 0.9 : 0.6 : 0.3;
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
      const intensity = boost ? 1 : 0.7;
      log.push(`finale.style: "${style}"`, `finale.intensity: ${intensity}`);
      return { patch: { ui: { finale: { style, intensity } } }, translationLog: log };
    }
    default:
      return { translationLog: [`(\u672A\u77E5\u306E\u304A\u984C ${promptId} \u2014 \u5909\u66F4\u306A\u3057)`] };
  }
}
__name(translateText, "translateText");
var DEFAULT_TINT = {
  slime: "#7cfc00",
  ball: "#dddddd",
  ghost: "#e0c3fc",
  bottle: "#05d9e8",
  cake: "#ffacc7"
};
var THEME_ACCENT = {
  popart: "#ff2a6d",
  cyber: "#00e5ff",
  handdrawn: "#ffffff",
  luxury: "#d4af37",
  kawaii: "#ff7eb6"
};
function buildEnemiesFromTraits(traits) {
  const base = {
    id: "e0",
    archetype: traits.archetype ?? "blob",
    skin: {
      base: traits.base ?? "slime",
      tint: traits.tint ?? DEFAULT_TINT[traits.base ?? "slime"],
      scale: traits.scale ?? 1.2
    },
    behavior: {
      moveSpeed: traits.moveSpeed ?? 140,
      bounce: traits.bounce ?? 0.6,
      jumpPower: traits.jumpPower ?? 460,
      aggression: traits.aggression ?? 0.4
    },
    spawn: "auto"
  };
  return [0, 1, 2].map((i) => ({
    ...base,
    id: `e${i}`,
    skin: { ...base.skin, scale: Math.round(base.skin.scale * (1 - i * 0.15) * 100) / 100 },
    behavior: { ...base.behavior }
  }));
}
__name(buildEnemiesFromTraits, "buildEnemiesFromTraits");

// src/params/StageParams.ts
var GIMMICK_PRESETS = {
  mirrorball: { id: "g-mirror", kind: "mirrorball", pos: { x: 0.5, y: 0.12 }, params: { rotationSpeed: 0.6, flashIntensity: 0.5 } },
  springpad: { id: "g-spring", kind: "springpad", pos: { x: 0.55, y: 0.92 }, params: { power: 1.6 } },
  confettiCannon: { id: "g-cannon", kind: "confettiCannon", pos: { x: 0.85, y: 0.85 }, params: { interval: 2.5, burst: 40 } },
  slipFloor: { id: "g-slip", kind: "slipFloor", pos: { x: 0.35, y: 0.92 }, params: { width: 0.2 } },
  spotlight: { id: "g-spot", kind: "spotlight", pos: { x: 0.2, y: 0.5 }, params: { radius: 140 } }
};

// worker/RoomDO.ts
var ROLES = ["A", "B", "C"];
var GIMMICK_LABELS = {
  mirrorball: "\u30DF\u30E9\u30FC\u30DC\u30FC\u30EB",
  springpad: "\u30B9\u30D7\u30EA\u30F3\u30B0\u30D1\u30C3\u30C9",
  confettiCannon: "\u7D19\u5439\u96EA\u30AD\u30E3\u30CE\u30F3",
  slipFloor: "\u30B9\u30EA\u30C3\u30D7\u5E8A",
  spotlight: "\u30B9\u30DD\u30C3\u30C8\u30E9\u30A4\u30C8"
};
var RoomDO = class {
  static {
    __name(this, "RoomDO");
  }
  conns = [];
  phase = "lobby";
  roleCursor = 0;
  playerSeq = 0;
  enemyTraits = {};
  gimmicks = [];
  gimmickSeq = 0;
  holding = /* @__PURE__ */ new Set();
  chargeTimer = null;
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const isHost = new URL(req.url).searchParams.get("role") === "host";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const conn = { ws: server, isHost };
    this.conns.push(conn);
    server.addEventListener("message", (e) => {
      try {
        this.onMessage(conn, JSON.parse(e.data));
      } catch {
      }
    });
    const drop = /* @__PURE__ */ __name(() => this.onClose(conn), "drop");
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);
    if (isHost) this.send(conn, this.roomState());
    return new Response(null, { status: 101, webSocket: client });
  }
  // ---- メッセージ処理 ----
  onMessage(conn, msg) {
    switch (msg.type) {
      case "join":
        return this.onJoin(conn, msg.name);
      case "input_text":
        return this.onInputText(conn, msg.promptId, msg.text);
      case "place_stamp":
        return this.onPlaceStamp(conn, msg.promptId, msg.kind, msg.x, msg.y);
      case "build_hold":
        return this.onBuildHold(conn, msg.holding);
      case "cheer":
        if (conn.player) this.broadcast({ type: "cheer", emoji: msg.emoji, name: conn.player.name });
        return;
      case "host_phase":
        if (conn.isHost) this.setPhase(msg.phase);
        return;
    }
  }
  onJoin(conn, name) {
    if (conn.player) return;
    const role = ROLES[this.roleCursor % ROLES.length];
    this.roleCursor++;
    conn.player = {
      id: `p${this.playerSeq++}`,
      name: String(name).slice(0, 12) || "\u540D\u7121\u3057\u306E\u5EFA\u7BC9\u5BB6",
      role,
      done: 0
    };
    this.send(conn, {
      type: "joined",
      playerId: conn.player.id,
      role,
      cards: PROMPT_CARDS[role],
      phase: this.phase
    });
    this.broadcast(this.roomState());
  }
  onInputText(conn, promptId, text) {
    const player = conn.player;
    if (!player) return;
    const cleaned = String(text).slice(0, 120).trim();
    const result = translateText(promptId, cleaned);
    let patch = result.patch;
    if (result.enemy) {
      Object.assign(this.enemyTraits, result.enemy);
      patch = { enemies: buildEnemiesFromTraits(this.enemyTraits) };
    }
    if (patch) {
      this.broadcast({
        type: "params_patch",
        patch,
        sourceText: cleaned,
        author: player.name,
        translationLog: result.translationLog
      });
    }
    this.send(conn, { type: "reflected", promptId });
    this.markAnswered(player);
  }
  onPlaceStamp(conn, promptId, kind, x, y) {
    const player = conn.player;
    if (!player || !(kind in GIMMICK_PRESETS)) return;
    const preset = GIMMICK_PRESETS[kind];
    const def = {
      id: `g${this.gimmickSeq++}`,
      kind,
      pos: { x: clamp01(x), y: clamp01(y) },
      params: { ...preset.params }
    };
    this.gimmicks.push(def);
    this.broadcast({
      type: "params_patch",
      patch: { gimmicks: [...this.gimmicks] },
      sourceText: `\u30B9\u30BF\u30F3\u30D7: ${GIMMICK_LABELS[kind]}`,
      author: player.name,
      translationLog: [
        `kind: "${kind}"`,
        `pos: (${def.pos.x.toFixed(2)}, ${def.pos.y.toFixed(2)})`
      ]
    });
    this.send(conn, { type: "reflected", promptId });
    this.markAnswered(player);
  }
  markAnswered(player) {
    player.done++;
    this.broadcast(this.roomState());
    const players = this.players();
    const allDone = players.length > 0 && players.every((p) => p.done >= PROMPT_CARDS[p.role].length);
    if (allDone && this.phase === "create") this.setPhase("buildready");
  }
  // 全員が同時に長押しし続けるとビルド発火（協働の儀式・設計書 1.2 Phase 3）
  onBuildHold(conn, holding) {
    const player = conn.player;
    if (!player || this.phase !== "buildready") return;
    if (holding) this.holding.add(player.id);
    else this.holding.delete(player.id);
    const all = this.players().length > 0 && this.holding.size === this.players().length;
    if (all && !this.chargeTimer) {
      this.broadcast({ type: "build_charge", state: "start", durationMs: BUILD_CHARGE_MS });
      this.chargeTimer = setTimeout(() => {
        this.chargeTimer = null;
        this.phase = "build";
        this.broadcast({ type: "phase_change", phase: "build" });
        this.broadcast({ type: "build_start" });
      }, BUILD_CHARGE_MS);
    } else if (!all && this.chargeTimer) {
      clearTimeout(this.chargeTimer);
      this.chargeTimer = null;
      this.broadcast({ type: "build_charge", state: "cancel", durationMs: BUILD_CHARGE_MS });
    }
  }
  onClose(conn) {
    const i = this.conns.indexOf(conn);
    if (i >= 0) this.conns.splice(i, 1);
    if (conn.player) {
      this.holding.delete(conn.player.id);
      this.broadcast(this.roomState());
    }
  }
  // ---- ユーティリティ ----
  setPhase(phase) {
    this.phase = phase;
    this.broadcast({ type: "phase_change", phase });
  }
  players() {
    return this.conns.filter((c) => c.player).map((c) => c.player);
  }
  roomState() {
    return { type: "room_state", players: this.players(), phase: this.phase };
  }
  send(conn, msg) {
    try {
      conn.ws.send(JSON.stringify(msg));
    } catch {
    }
  }
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const c of this.conns) {
      try {
        c.ws.send(data);
      } catch {
      }
    }
  }
};
function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0));
}
__name(clamp01, "clamp01");

// worker/index.ts
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/ws\/([a-zA-Z0-9]{4,8})$/);
    if (m) {
      const id = env.ROOM.idFromName(m[1].toUpperCase());
      return env.ROOM.get(id).fetch(req);
    }
    return env.ASSETS.fetch(req);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-eBFrXP/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-eBFrXP/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RoomDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
