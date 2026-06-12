// 10分セッションの自動リハーサル — 仮想参加者3名がフルセッションを演じる。
// ホストPCで /?host&room=SHOW を投影しながら実行すると、本番と同じ流れを1人で確認できる。
//
// 使い方:
//   node scripts/rehearsal.mjs                  … ローカル(wrangler dev)のルーム SHOW
//   node scripts/rehearsal.mjs ABCD             … ルーム指定
//   REHEARSAL_URL=wss://... node scripts/rehearsal.mjs SHOW   … 本番に対して
//   FAST=1 …待ち時間を1/10に短縮（動作確認用）
//   AUTO=1 …ホスト不在でもスクリプトがフェーズを自動進行（CI/単独検証用）

const BASE = process.env.REHEARSAL_URL ?? "ws://localhost:8787";
const ROOM = (process.argv[2] ?? "SHOW").toUpperCase();
const SPEED = process.env.FAST ? 0.1 : 1;
const AUTO = !!process.env.AUTO;

const t0 = Date.now();
const log = (msg) => {
  const s = Math.floor((Date.now() - t0) / 1000);
  console.log(`[${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}] ${msg}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

// 仮想参加者の台本（お題ごとの回答と「考える時間」）
const CAST = [
  {
    name: "ミカ",
    answers: [
      ["a1", "ネオン輝くディスコ。星空も見えるとうれしい", 14000],
      ["a2", "アップテンポなEDM！とにかく踊れるやつ", 16000],
      ["a3", "嵐みたいにハイスピード", 12000],
    ],
  },
  {
    name: "レン",
    answers: [
      ["b1", "緑のぷるぷるスライムドリンク", 15000],
      ["b2", "すごく跳ね回る。しつこくはない", 14000],
      ["b3", null, 16000], // スタンプ配置
    ],
  },
  {
    name: "ソラ",
    answers: [
      ["c1", "ポップアート風のコミックっぽいUI", 16000],
      ["c2", "画面を埋め尽くす紙吹雪！", 13000],
      ["c3", "ディスコ・ドロップで爆発みたいに", 15000],
    ],
  },
];

function connect(query = "") {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE}/ws/${ROOM}${query}`);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("接続失敗。wrangler dev は起動していますか？")));
  });
}
const send = (ws, msg) => ws.send(JSON.stringify(msg));

function onMsg(ws, handler) {
  ws.addEventListener("message", (e) => handler(JSON.parse(e.data)));
}

log(`リハーサル開始 — ルーム ${ROOM} @ ${BASE}`);
log(`ホスト画面: ${BASE.replace(/^ws/, "http")}/?host&room=${ROOM}`);

// 観測用ホスト接続（AUTO時はフェーズ進行も担う）
const hostWs = await connect("?role=host");
let phase = "lobby";
let buildStarted = false;
onMsg(hostWs, (m) => {
  if (m.type === "phase_change") {
    phase = m.phase;
    log(`フェーズ → ${m.phase}`);
  }
  if (m.type === "params_patch") log(`  反映 [${m.engine ?? "stamp"}] ${m.author}「${m.sourceText}」`);
  if (m.type === "build_start") {
    buildStarted = true;
    log("🔨 BUILD START！メインスクリーンに注目");
  }
});

// 参加者がパラパラと入室
const phones = [];
for (const member of CAST) {
  await wait(2500);
  const ws = await connect();
  send(ws, { type: "join", name: member.name });
  log(`${member.name} が参加`);
  phones.push({ ws, member, reflected: [] });
  onMsg(ws, (m) => {
    if (m.type === "reflected") phones.find((p) => p.ws === ws).reflected.push(m.promptId);
  });
}

// フェーズ開始（AUTO時はスクリプトが、通常はホストの「スタート」ボタンを待つ）
if (AUTO) {
  await wait(3000);
  send(hostWs, { type: "host_phase", phase: "create" });
} else {
  log("ホスト画面で「スタート」を押してください…");
}
while (phase !== "create") await new Promise((r) => setTimeout(r, 200));

// 各参加者が自分のペースでお題に回答（並行）
await Promise.all(
  phones.map(async ({ ws, member }) => {
    for (const [promptId, text, thinkMs] of member.answers) {
      await wait(thinkMs);
      if (text === null) {
        send(ws, { type: "place_stamp", promptId, kind: "mirrorball", x: 0.5, y: 0.15 });
        log(`${member.name} がスタンプを配置（ミラーボール）`);
      } else {
        send(ws, { type: "input_text", promptId, text });
        log(`${member.name} が送信: 「${text}」`);
      }
      await wait(3000); // 反映の余韻
    }
  })
);

// buildready を待って、3人同時長押し
while (phase !== "buildready") await new Promise((r) => setTimeout(r, 200));
log("全員のお題完了。3秒後に同時長押し…");
await wait(3000);
for (const { ws } of phones) send(ws, { type: "build_hold", holding: true });
log("3人がBUILDを長押し中…");
while (!buildStarted) await new Promise((r) => setTimeout(r, 100));
for (const { ws } of phones) send(ws, { type: "build_hold", holding: false });

// プレイ中の歓声（ホストがビルド演出後に play へ進めるのを待つ / AUTOなら自走）
if (AUTO) {
  await wait(16000);
  send(hostWs, { type: "host_phase", phase: "play" });
}
log("歓声タイム（30秒）");
const emojis = ["🎉", "🔥", "❤️", "👏", "⭐"];
for (let i = 0; i < 10; i++) {
  await wait(3000);
  const p = phones[i % phones.length];
  send(p.ws, { type: "cheer", emoji: emojis[i % emojis.length] });
}

if (AUTO) send(hostWs, { type: "host_phase", phase: "debrief" });
log("リハーサル終了。ホストパネルの「📜 翻訳の全記録」で解説の流れを確認してください。");

const answered = phones.map((p) => `${p.member.name}:${p.reflected.length}/3`).join(" ");
log(`回答反映: ${answered}`);
[hostWs, ...phones.map((p) => p.ws)].forEach((w) => w.close());
process.exit(0);
