import QRCode from "qrcode";
import { BUILD_CHARGE_MS, type C2S, type S2C } from "../../shared/protocol";
import { ROLE_INFO } from "../../shared/prompts";
import { buildLogLine } from "../demo/inputs";
import type { ParamStore } from "../params/ParamStore";
import { HostPanel } from "../ui/hostPanel";

// ホスト画面のWS統合 — QRロビー、params_patch受信→儀式、ビルド充電ゲージ、歓声。
// Durable Object（/ws/:room?role=host）に接続し、StageParamsの正本に追従する。

export interface HostDeps {
  store: ParamStore;
  sessionLog: string[];
  runBuild: (onDone?: () => void) => void;
  setAutopilot: (on: boolean) => void;
}

export function startHostMode(roomCode: string, deps: HostDeps): void {
  const lobby = document.getElementById("lobby")!;
  const playerList = document.getElementById("player-list")!;
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
  const gauge = document.getElementById("buildgauge")!;
  const gaugeFill = document.getElementById("buildgauge-fill")!;
  const cheers = document.getElementById("cheers")!;

  const joinUrl = `${location.origin}/mobile?room=${roomCode}`;
  document.getElementById("room-code")!.textContent = roomCode;
  document.getElementById("join-url")!.textContent = joinUrl;
  void QRCode.toCanvas(document.getElementById("qr") as HTMLCanvasElement, joinUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#0d0221", light: "#ffffff" },
  });
  lobby.classList.remove("hidden");

  const ws = new WebSocket(`${location.origin.replace(/^http/, "ws")}/ws/${roomCode}?role=host`);
  const send = (msg: C2S) => ws.send(JSON.stringify(msg));

  const panel = new HostPanel({
    sendPhase: (phase) => {
      send({ type: "host_phase", phase });
      if (phase === "create") lobby.classList.add("hidden");
    },
    setAutopilot: deps.setAutopilot,
  });

  // スタイル確認・デモ用: #demo-records でダミーの記録を流し込んで全記録画面を開く
  if (location.hash === "#demo-records") {
    lobby.classList.add("hidden");
    const demo: [string, string, string[]][] = [
      ["ミカ", "ネオン輝くディスコ", ['palette: "neon"', 'backdrop: "disco"', "── 光の洪水を色調に変換"]],
      ["レン", "跳ね回るスライムドリンク", ['skin.base: "slime"', "bounce: 0.85", "jumpPower: 520", "── 弾ける勢いを跳躍力に"]],
      ["ソラ", "画面を埋め尽くす紙吹雪", ['particles.type: "confetti"', "particles.density: 0.9", "── 圧倒的密度で祝祭感"]],
    ];
    for (const [author, sourceText, translationLog] of demo) {
      panel.addRecord({ author, sourceText, translationLog, engine: "ai" });
    }
    setTimeout(() => panel.toggleOverlay(), 2500);
  }

  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data as string) as S2C;
    switch (msg.type) {
      case "room_state": {
        panel.setPlayers(msg.players);
        playerList.innerHTML = "";
        for (const p of msg.players) {
          const li = document.createElement("li");
          li.innerHTML = `<b style="color:${ROLE_INFO[p.role].color}">${p.role}</b> ${escapeHtml(p.name)} <span class="done">${"●".repeat(p.done)}${"○".repeat(Math.max(0, 3 - p.done))}</span>`;
          playerList.appendChild(li);
        }
        startBtn.disabled = msg.players.length === 0;
        break;
      }
      case "params_patch": {
        for (const line of msg.translationLog) {
          deps.sessionLog.push(buildLogLine(msg.sourceText, line));
        }
        panel.addRecord({
          author: msg.author,
          sourceText: msg.sourceText,
          translationLog: msg.translationLog,
          engine: msg.engine,
        });
        deps.store.patch(msg.patch, {
          sourceText: msg.sourceText,
          author: msg.author,
          translationLog: msg.translationLog,
        });
        break;
      }
      case "build_charge":
        if (msg.state === "start") {
          gauge.classList.remove("hidden");
          gaugeFill.style.transition = `width ${msg.durationMs ?? BUILD_CHARGE_MS}ms linear`;
          requestAnimationFrame(() => (gaugeFill.style.width = "100%"));
        } else {
          gaugeFill.style.transition = "width 200ms";
          gaugeFill.style.width = "0%";
        }
        break;
      case "build_start":
        gauge.classList.add("hidden");
        gaugeFill.style.width = "0%";
        deps.runBuild(() => send({ type: "host_phase", phase: "play" }));
        break;
      case "cheer":
        floatCheer(cheers, msg.emoji);
        break;
      case "phase_change":
        panel.setPhase(msg.phase);
        if (msg.phase !== "lobby") lobby.classList.add("hidden");
        break;
      case "joined":
      case "reflected":
        break;
    }
  });

  startBtn.addEventListener("click", () => {
    send({ type: "host_phase", phase: "create" });
    lobby.classList.add("hidden");
  });
}

export function randomRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字(I/O/0/1)を除外
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function floatCheer(layer: HTMLElement, emoji: string): void {
  const span = document.createElement("span");
  span.className = "cheer-float";
  span.textContent = emoji;
  span.style.left = `${10 + Math.random() * 80}%`;
  layer.appendChild(span);
  setTimeout(() => span.remove(), 2600);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
