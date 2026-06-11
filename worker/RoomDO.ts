import {
  BUILD_CHARGE_MS,
  type C2S,
  type Phase,
  type PlayerInfo,
  type Role,
  type S2C,
} from "../shared/protocol";
import { PROMPT_CARDS } from "../shared/prompts";
import { buildEnemiesFromTraits, translateText, type EnemyTraits } from "../shared/translate";
import { GIMMICK_PRESETS, type GimmickDef, type GimmickKind } from "../src/params/StageParams";

// RoomDO — 1ルーム = 1 Durable Object。StageParamsへのパッチ発行の正本（設計書 3.2/3.3）。
// 研修1回ぶん（〜10分）のセッションを想定し、状態はインメモリで持つ
// （全WebSocket切断でルームは自然消滅する。永続化はしない）。

interface Conn {
  ws: WebSocket;
  isHost: boolean;
  player?: PlayerInfo;
}

const ROLES: Role[] = ["A", "B", "C"];
const GIMMICK_LABELS: Record<GimmickKind, string> = {
  mirrorball: "ミラーボール",
  springpad: "スプリングパッド",
  confettiCannon: "紙吹雪キャノン",
  slipFloor: "スリップ床",
  spotlight: "スポットライト",
};

export class RoomDO implements DurableObject {
  private conns: Conn[] = [];
  private phase: Phase = "lobby";
  private roleCursor = 0;
  private playerSeq = 0;
  private enemyTraits: EnemyTraits = {};
  private gimmicks: GimmickDef[] = [];
  private gimmickSeq = 0;
  private holding = new Set<string>();
  private chargeTimer: ReturnType<typeof setTimeout> | null = null;

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const isHost = new URL(req.url).searchParams.get("role") === "host";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();

    const conn: Conn = { ws: server, isHost };
    this.conns.push(conn);
    server.addEventListener("message", (e) => {
      try {
        this.onMessage(conn, JSON.parse(e.data as string) as C2S);
      } catch {
        // 不正なメッセージは無視（研修ツールなので落とさないことを優先）
      }
    });
    const drop = () => this.onClose(conn);
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);

    if (isHost) this.send(conn, this.roomState());
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---- メッセージ処理 ----

  private onMessage(conn: Conn, msg: C2S): void {
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

  private onJoin(conn: Conn, name: string): void {
    if (conn.player) return;
    const role = ROLES[this.roleCursor % ROLES.length];
    this.roleCursor++;
    conn.player = {
      id: `p${this.playerSeq++}`,
      name: String(name).slice(0, 12) || "名無しの建築家",
      role,
      done: 0,
    };
    this.send(conn, {
      type: "joined",
      playerId: conn.player.id,
      role,
      cards: PROMPT_CARDS[role],
      phase: this.phase,
    });
    this.broadcast(this.roomState());
  }

  private onInputText(conn: Conn, promptId: string, text: string): void {
    const player = conn.player;
    if (!player) return;
    const cleaned = String(text).slice(0, 120).trim();
    const result = translateText(promptId, cleaned);

    let patch = result.patch;
    if (result.enemy) {
      // b1(見た目)とb2(動き)は配列丸ごと置換で衝突するため、DOがテンプレートに合流させる
      Object.assign(this.enemyTraits, result.enemy);
      patch = { enemies: buildEnemiesFromTraits(this.enemyTraits) };
    }
    if (patch) {
      this.broadcast({
        type: "params_patch",
        patch,
        sourceText: cleaned,
        author: player.name,
        translationLog: result.translationLog,
      });
    }
    this.send(conn, { type: "reflected", promptId });
    this.markAnswered(player);
  }

  private onPlaceStamp(conn: Conn, promptId: string, kind: GimmickKind, x: number, y: number): void {
    const player = conn.player;
    if (!player || !(kind in GIMMICK_PRESETS)) return;
    const preset = GIMMICK_PRESETS[kind];
    const def: GimmickDef = {
      id: `g${this.gimmickSeq++}`,
      kind,
      pos: { x: clamp01(x), y: clamp01(y) },
      params: { ...preset.params },
    };
    this.gimmicks.push(def);
    this.broadcast({
      type: "params_patch",
      patch: { gimmicks: [...this.gimmicks] },
      sourceText: `スタンプ: ${GIMMICK_LABELS[kind]}`,
      author: player.name,
      translationLog: [
        `kind: "${kind}"`,
        `pos: (${def.pos.x.toFixed(2)}, ${def.pos.y.toFixed(2)})`,
      ],
    });
    this.send(conn, { type: "reflected", promptId });
    this.markAnswered(player);
  }

  private markAnswered(player: PlayerInfo): void {
    player.done++;
    this.broadcast(this.roomState());
    const players = this.players();
    const allDone =
      players.length > 0 && players.every((p) => p.done >= PROMPT_CARDS[p.role].length);
    if (allDone && this.phase === "create") this.setPhase("buildready");
  }

  // 全員が同時に長押しし続けるとビルド発火（協働の儀式・設計書 1.2 Phase 3）
  private onBuildHold(conn: Conn, holding: boolean): void {
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

  private onClose(conn: Conn): void {
    const i = this.conns.indexOf(conn);
    if (i >= 0) this.conns.splice(i, 1);
    if (conn.player) {
      this.holding.delete(conn.player.id);
      this.broadcast(this.roomState());
    }
  }

  // ---- ユーティリティ ----

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.broadcast({ type: "phase_change", phase });
  }

  private players(): PlayerInfo[] {
    return this.conns.filter((c) => c.player).map((c) => c.player!);
  }

  private roomState(): S2C {
    return { type: "room_state", players: this.players(), phase: this.phase };
  }

  private send(conn: Conn, msg: S2C): void {
    try {
      conn.ws.send(JSON.stringify(msg));
    } catch {
      // 送信失敗はclose処理に任せる
    }
  }

  private broadcast(msg: S2C): void {
    const data = JSON.stringify(msg);
    for (const c of this.conns) {
      try {
        c.ws.send(data);
      } catch {
        /* noop */
      }
    }
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number(v) || 0));
}
