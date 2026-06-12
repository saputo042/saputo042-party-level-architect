import type { C2S, PromptCard, S2C } from "../../shared/protocol";
import { ROLE_INFO } from "../../shared/prompts";
import type { GimmickKind } from "../params/StageParams";

// スマホ参加者UI — 参加 → 役割カード → お題カード → スタンプ配置 → BUILD長押し → 歓声。
// 画面は <section class="screen"> の切替で表現する素朴なステートマシン。

const qs = new URLSearchParams(location.search);
const room = (qs.get("room") ?? "").toUpperCase();

let ws: WebSocket | null = null;
let cards: PromptCard[] = [];
let cardIndex = 0;

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

function show(id: string): void {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(`#${id}`).classList.add("active");
}

function send(msg: C2S): void {
  ws?.send(JSON.stringify(msg));
}

function vibrate(pattern: number | number[]): void {
  navigator.vibrate?.(pattern);
}

// ---- 参加 ----

$("#join-btn").addEventListener("click", () => {
  const name = ($("#name-input") as HTMLInputElement).value.trim();
  if (!name) return showError("なまえを入れてください");
  if (!room) return showError("ルームコードがありません。ホスト画面のQRから開いてください");
  connect(name);
});

function showError(text: string): void {
  const el = $("#join-error");
  el.textContent = text;
  el.classList.remove("hidden");
}

function connect(name: string): void {
  const url = `${location.origin.replace(/^http/, "ws")}/ws/${room}`;
  ws = new WebSocket(url);
  ws.addEventListener("open", () => send({ type: "join", name }));
  ws.addEventListener("message", (e) => onMessage(JSON.parse(e.data as string) as S2C));
  ws.addEventListener("close", () => showError("接続が切れました。リロードしてください"));
}

// ---- サーバからのメッセージ ----

function onMessage(msg: S2C): void {
  switch (msg.type) {
    case "joined": {
      cards = msg.cards;
      const info = ROLE_INFO[msg.role];
      document.documentElement.style.setProperty("--role-color", info.color);
      $("#s-role .role-letter").textContent = msg.role;
      $("#s-role .role-label").textContent = info.label;
      $("#s-role .role-desc").textContent = info.desc;
      vibrate(80);
      show("s-role");
      if (msg.phase === "create") startCards();
      break;
    }
    case "phase_change":
      if (msg.phase === "create" && cardIndex === 0 && cards.length) startCards();
      if (msg.phase === "buildready") show("s-build");
      if (msg.phase === "play") {
        vibrate([60, 60, 60]);
        show("s-play");
      }
      if (msg.phase === "debrief") show("s-debrief");
      break;
    case "reflected": {
      vibrate([40, 50, 120]);
      $("#reflected-stamp").classList.remove("hidden");
      setTimeout(() => {
        cardIndex++;
        if (cardIndex < cards.length) showCard();
        else show("s-done");
      }, 1300);
      break;
    }
    case "build_charge":
      if (msg.state === "start") chargeStart(msg.durationMs);
      else chargeCancel();
      break;
    case "build_start":
      vibrate(200);
      $("#build-status").textContent = "BUILDING... メインスクリーンを見よ！";
      break;
    case "room_state":
    case "params_patch":
    case "cheer":
      break; // スマホ側では未使用
  }
}

// ---- お題カード ----

function startCards(): void {
  cardIndex = 0;
  showCard();
}

function showCard(): void {
  const card = cards[cardIndex];
  const progress = `MISSION ${cardIndex + 1} / ${cards.length}`;
  if (card.kind === "stamp") {
    $("#s-stamp .card-progress").textContent = progress;
    $("#s-stamp .prompt-title").textContent = card.title;
    $("#s-stamp .prompt-hint").textContent = card.hint;
    setupStampUi(card.id);
    show("s-stamp");
  } else {
    $("#s-card .card-progress").textContent = progress;
    $("#s-card .prompt-title").textContent = card.title;
    $("#s-card .prompt-hint").textContent = card.hint;
    ($("#answer") as HTMLTextAreaElement).value = "";
    show("s-card");
  }
}

$("#send-btn").addEventListener("click", () => {
  const text = ($("#answer") as HTMLTextAreaElement).value.trim();
  if (!text) return;
  send({ type: "input_text", promptId: cards[cardIndex].id, text });
  vibrate(30);
  $("#reflected-stamp").classList.add("hidden");
  show("s-sent");
});

// ---- スタンプ配置 ----

const STAMPS: { kind: GimmickKind; emoji: string; name: string }[] = [
  { kind: "mirrorball", emoji: "🪩", name: "ミラーボール" },
  { kind: "springpad", emoji: "🌀", name: "スプリング" },
  { kind: "confettiCannon", emoji: "🎉", name: "キャノン" },
  { kind: "slipFloor", emoji: "🧊", name: "スリップ床" },
  { kind: "spotlight", emoji: "🔦", name: "スポット" },
];

let stampKind: GimmickKind | null = null;
let stampPos: { x: number; y: number } | null = null;

function setupStampUi(promptId: string): void {
  stampKind = null;
  stampPos = null;
  $("#stamp-marker").classList.add("hidden");
  ($("#stamp-send") as HTMLButtonElement).disabled = true;

  const palette = $("#stamp-palette");
  palette.innerHTML = "";
  for (const s of STAMPS) {
    const btn = document.createElement("button");
    btn.innerHTML = `${s.emoji}<span class="stamp-name">${s.name}</span>`;
    btn.addEventListener("click", () => {
      stampKind = s.kind;
      palette.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      $("#stamp-marker").textContent = s.emoji;
      updateSendState();
    });
    palette.appendChild(btn);
  }

  const map = $("#stamp-map");
  map.onclick = (e: MouseEvent) => {
    if (!stampKind) return;
    const rect = map.getBoundingClientRect();
    stampPos = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    const marker = $("#stamp-marker");
    marker.style.left = `${stampPos.x * 100}%`;
    marker.style.top = `${stampPos.y * 100}%`;
    marker.classList.remove("hidden");
    vibrate(20);
    updateSendState();
  };

  ($("#stamp-send") as HTMLButtonElement).onclick = () => {
    if (!stampKind || !stampPos) return;
    send({ type: "place_stamp", promptId, kind: stampKind, x: stampPos.x, y: stampPos.y });
    vibrate(30);
    $("#reflected-stamp").classList.add("hidden");
    show("s-sent");
  };
}

function updateSendState(): void {
  ($("#stamp-send") as HTMLButtonElement).disabled = !(stampKind && stampPos);
}

// ---- BUILD 長押し ----

let chargeAnim: number | null = null;

const buildBtn = $("#build-btn");
const startHold = (e: Event) => {
  e.preventDefault();
  send({ type: "build_hold", holding: true });
  vibrate(20);
};
const endHold = () => send({ type: "build_hold", holding: false });
buildBtn.addEventListener("pointerdown", startHold);
buildBtn.addEventListener("pointerup", endHold);
buildBtn.addEventListener("pointerleave", endHold);

function chargeStart(durationMs: number): void {
  $("#build-status").textContent = "充電中…全員そのまま！";
  const fill = $("#build-fill");
  const t0 = performance.now();
  const step = (t: number) => {
    const pct = Math.min(1, (t - t0) / durationMs);
    fill.style.top = `${(1 - pct) * 100}%`;
    if (pct < 1) chargeAnim = requestAnimationFrame(step);
  };
  chargeAnim = requestAnimationFrame(step);
}

function chargeCancel(): void {
  if (chargeAnim) cancelAnimationFrame(chargeAnim);
  $("#build-fill").style.top = "100%";
  $("#build-status").textContent = "誰かが離した！もう一度全員で！";
  vibrate([30, 30, 30]);
}

// ---- 歓声 ----

document.querySelectorAll<HTMLButtonElement>("#cheer-btns button").forEach((btn) => {
  btn.addEventListener("click", () => {
    send({ type: "cheer", emoji: btn.dataset.emoji! });
    vibrate(15);
  });
});
