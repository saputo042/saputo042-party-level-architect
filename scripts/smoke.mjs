// 通信層スモークテスト: ホスト+参加者3名で 参加→翻訳→スタンプ→BUILD長押し→build_start を通す。
// 使い方: wrangler dev起動後に `node scripts/smoke.mjs` (Node 22+, global WebSocket使用)

const BASE = process.env.SMOKE_URL ?? "ws://localhost:8787";
const ROOM = "TEST";

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failures++;
};

function connect(query = "") {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE}/ws/${ROOM}${query}`);
    ws.inbox = [];
    ws.waiters = [];
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      const i = ws.waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) ws.waiters.splice(i, 1)[0].resolve(msg);
      else ws.inbox.push(msg);
    });
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e) => reject(new Error(`WS error: ${e.message ?? e}`)));
  });
}

function waitFor(ws, pred, label, timeoutMs = 5000) {
  const i = ws.inbox.findIndex(pred);
  if (i >= 0) return Promise.resolve(ws.inbox.splice(i, 1)[0]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting: ${label}`)), timeoutMs);
    ws.waiters.push({
      pred,
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
      },
    });
  });
}

const send = (ws, msg) => ws.send(JSON.stringify(msg));

try {
  // 1. ホスト接続
  const host = await connect("?role=host");
  const state0 = await waitFor(host, (m) => m.type === "room_state", "host room_state");
  ok(state0.players.length === 0, "ホスト接続時 players=0");

  // 2. 参加者3名 join → 役割 A/B/C
  const phones = [];
  const roles = [];
  for (const name of ["ミカ", "レン", "ソラ"]) {
    const ws = await connect();
    send(ws, { type: "join", name });
    const joined = await waitFor(ws, (m) => m.type === "joined", `${name} joined`);
    roles.push(joined.role);
    ok(joined.cards.length === 3, `${name} にお題カード3枚 (role=${joined.role})`);
    phones.push(ws);
  }
  ok(roles.join("") === "ABC", `役割割当が A,B,C (${roles.join(",")})`);

  // 3. フェーズ開始
  send(host, { type: "host_phase", phase: "create" });
  await waitFor(phones[0], (m) => m.type === "phase_change" && m.phase === "create", "create phase");

  // 4. テキスト入力 → 辞書翻訳 → params_patch
  send(phones[0], { type: "input_text", promptId: "a1", text: "ネオン輝くディスコ" });
  const patch1 = await waitFor(host, (m) => m.type === "params_patch", "a1 params_patch");
  ok(patch1.patch.environment?.palette === "neon", `「ネオン輝くディスコ」→ palette: ${patch1.patch.environment?.palette}`);
  ok(patch1.patch.environment?.backdrop === "disco", `→ backdrop: ${patch1.patch.environment?.backdrop}`);
  ok(patch1.author === "ミカ", `author=${patch1.author}`);
  ok(patch1.translationLog.length >= 2, `translationLog ${patch1.translationLog.length}行`);
  await waitFor(phones[0], (m) => m.type === "reflected" && m.promptId === "a1", "a1 reflected");
  ok(true, "a1 reflected受信（スマホ振動トリガー）");

  // 5. 敵の見た目(b1) + 動き(b2) がテンプレート合流すること
  send(phones[1], { type: "input_text", promptId: "b1", text: "緑のスライムドリンク" });
  const pb1 = await waitFor(host, (m) => m.type === "params_patch", "b1 patch");
  ok(pb1.patch.enemies?.[0]?.skin.base === "slime", `b1 → skin.base: ${pb1.patch.enemies?.[0]?.skin.base}`);
  send(phones[1], { type: "input_text", promptId: "b2", text: "すごく跳ね回る" });
  const pb2 = await waitFor(host, (m) => m.type === "params_patch", "b2 patch");
  ok(pb2.patch.enemies?.[0]?.skin.base === "slime", "b2 後も skin.base=slime が保持（テンプレート合流）");
  ok(pb2.patch.enemies?.[0]?.behavior.bounce >= 0.9, `b2 → bounce: ${pb2.patch.enemies?.[0]?.behavior.bounce}`);

  // 6. スタンプ配置
  send(phones[1], { type: "place_stamp", promptId: "b3", kind: "mirrorball", x: 0.5, y: 0.2 });
  const pg = await waitFor(host, (m) => m.type === "params_patch" && m.patch.gimmicks, "stamp patch");
  ok(pg.patch.gimmicks.length === 1 && pg.patch.gimmicks[0].kind === "mirrorball", "スタンプ → gimmicks[0]=mirrorball");

  // 7. 残りのお題を消化 → buildready 自動遷移
  send(phones[0], { type: "input_text", promptId: "a2", text: "アップテンポなEDM" });
  send(phones[0], { type: "input_text", promptId: "a3", text: "ハイスピード" });
  send(phones[2], { type: "input_text", promptId: "c1", text: "ポップアート風" });
  send(phones[2], { type: "input_text", promptId: "c2", text: "画面を埋め尽くす紙吹雪" });
  send(phones[2], { type: "input_text", promptId: "c3", text: "夜空いっぱいの花火" });
  await waitFor(host, (m) => m.type === "phase_change" && m.phase === "buildready", "buildready自動遷移", 8000);
  ok(true, "全お題完了 → buildready 自動遷移");

  // 8. BUILD同時長押し: 2人では発火せず、3人で充電開始→build_start
  send(phones[0], { type: "build_hold", holding: true });
  send(phones[1], { type: "build_hold", holding: true });
  let premature = false;
  const sniffer = (e) => {
    if (JSON.parse(e.data).type === "build_charge") premature = true;
  };
  host.addEventListener("message", sniffer);
  await new Promise((r) => setTimeout(r, 400));
  host.removeEventListener("message", sniffer);
  ok(!premature, "2人だけの長押しでは充電が始まらない");

  send(phones[2], { type: "build_hold", holding: true });
  await waitFor(host, (m) => m.type === "build_charge" && m.state === "start", "build_charge start");
  ok(true, "3人同時長押し → 充電開始");
  await waitFor(host, (m) => m.type === "build_start", "build_start", 4000);
  ok(true, "充電完了 → build_start");

  // 9. 歓声
  send(phones[2], { type: "cheer", emoji: "🎉" });
  const cheer = await waitFor(host, (m) => m.type === "cheer", "cheer");
  ok(cheer.emoji === "🎉" && cheer.name === "ソラ", `歓声 ${cheer.emoji} by ${cheer.name}`);

  [host, ...phones].forEach((w) => w.close());
} catch (err) {
  console.error("❌ SMOKE FAILED:", err.message);
  failures++;
}

console.log(failures === 0 ? "\n🎉 ALL PASS" : `\n💥 ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
