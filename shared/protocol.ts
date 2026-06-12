import type { ParamsPatch } from "../src/params/ParamStore";
import type { GimmickKind } from "../src/params/StageParams";

// WebSocketメッセージプロトコル（設計書 3.7）。
// クライアント（スマホ/ホスト画面）と Durable Object ルームサーバの共有定義。

export type Phase = "lobby" | "create" | "buildready" | "build" | "play" | "debrief";
export type Role = "A" | "B" | "C";

export interface PromptCard {
  id: string;
  title: string;
  hint: string;
  kind: "text" | "stamp";
}

export interface PlayerInfo {
  id: string;
  name: string;
  role: Role;
  done: number; // 回答済みお題数
}

export type C2S =
  | { type: "join"; name: string }
  | { type: "input_text"; promptId: string; text: string }
  | { type: "place_stamp"; promptId: string; kind: GimmickKind; x: number; y: number }
  | { type: "build_hold"; holding: boolean }
  | { type: "cheer"; emoji: string }
  | { type: "host_phase"; phase: Phase }; // ホストのみ

export type S2C =
  | { type: "joined"; playerId: string; role: Role; cards: PromptCard[]; phase: Phase }
  | { type: "room_state"; players: PlayerInfo[]; phase: Phase }
  | {
      type: "params_patch";
      patch: ParamsPatch;
      sourceText: string;
      author: string;
      translationLog: string[];
      engine?: "ai" | "dict"; // どの翻訳者が訳したか（ホストパネル表示・検証用）
    }
  | { type: "phase_change"; phase: Phase }
  | { type: "reflected"; promptId: string }
  | { type: "build_charge"; state: "start" | "cancel"; durationMs: number }
  | { type: "build_start" }
  | { type: "cheer"; emoji: string; name: string };

export const BUILD_CHARGE_MS = 1500;
