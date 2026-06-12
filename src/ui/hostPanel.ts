import type { Phase, PlayerInfo } from "../../shared/protocol";
import { ROLE_INFO } from "../../shared/prompts";

// ホスト操作パネル（設計書 3.6）+ 翻訳の全記録画面（設計書 2.2）。
// パネルはホストの進行管理とカンペ、全記録オーバーレイは解説フェーズの投影用。

export interface TranslationRecord {
  author: string;
  sourceText: string;
  translationLog: string[];
  engine?: "ai" | "dict";
}

export interface HostPanelDeps {
  sendPhase: (phase: Phase) => void;
  setAutopilot: (on: boolean) => void;
}

// フェーズごとの推奨時間（秒）— 設計書1.2の10分タイムライン
const PHASE_PLAN: Partial<Record<Phase, number>> = {
  create: 300,
  buildready: 60,
  build: 60,
  play: 90,
  debrief: 60,
};

const PHASE_LABEL: Record<Phase, string> = {
  lobby: "接続待ち",
  create: "体現（お題回答中）",
  buildready: "ビルド準備（全員長押し待ち）",
  build: "ビルド中",
  play: "プレイ",
  debrief: "解説",
};

export class HostPanel {
  private records: TranslationRecord[] = [];
  private roleOf = new Map<string, string>();
  private phase: Phase = "lobby";
  private phaseStartedAt = Date.now();
  private bar: HTMLElement;
  private overlay: HTMLElement;

  constructor(private deps: HostPanelDeps) {
    this.bar = this.buildBar();
    this.overlay = this.buildOverlay();
    const wrap = document.getElementById("stage-wrap")!;
    wrap.appendChild(this.bar);
    wrap.appendChild(this.overlay);

    setInterval(() => this.renderTimer(), 1000);
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r" && !isTyping()) this.toggleOverlay();
    });
  }

  // ---- 外部から呼ばれる更新 ----

  addRecord(rec: TranslationRecord): void {
    this.records.push(rec);
    this.renderRecords();
  }

  setPlayers(players: PlayerInfo[]): void {
    for (const p of players) this.roleOf.set(p.name, p.role);
  }

  setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseStartedAt = Date.now();
    this.bar.querySelector("#hb-phase")!.textContent = PHASE_LABEL[phase];
    // 解説フェーズに入ったら自動で「翻訳の全記録」を投影する
    if (phase === "debrief") this.showOverlay(true);
  }

  toggleOverlay(): void {
    this.showOverlay(this.overlay.classList.contains("hidden"));
  }

  // ---- DOM構築 ----

  private buildBar(): HTMLElement {
    const bar = document.createElement("div");
    bar.id = "hostbar";
    bar.innerHTML = `
      <div class="hb-head">
        <span id="hb-phase">${PHASE_LABEL.lobby}</span>
        <span id="hb-timer"></span>
        <button id="hb-fold" title="折りたたみ">▾</button>
      </div>
      <div class="hb-body">
        <div class="hb-row" id="hb-phases">
          <button data-phase="create">▶ 体現開始</button>
          <button data-phase="buildready">🔋 ビルド準備</button>
          <button data-phase="build" class="danger">⚡ 強制ビルド</button>
          <button data-phase="play">🎮 プレイ</button>
          <button data-phase="debrief">🎓 解説</button>
        </div>
        <div class="hb-row">
          <button id="hb-records-btn">📜 翻訳の全記録 (R)</button>
          <label class="hb-toggle"><input type="checkbox" id="hb-auto" /> 🤖 デモ自動走行</label>
        </div>
        <div id="hb-records"><p class="hb-empty">入力が届くとここにカンペが溜まります</p></div>
      </div>`;

    bar.querySelectorAll<HTMLButtonElement>("#hb-phases button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const phase = btn.dataset.phase as Phase;
        if (phase === "build" && !confirm("長押しの儀式をスキップしてビルドを強制発火しますか？")) return;
        this.deps.sendPhase(phase);
      });
    });
    bar.querySelector("#hb-records-btn")!.addEventListener("click", () => this.toggleOverlay());
    bar.querySelector<HTMLInputElement>("#hb-auto")!.addEventListener("change", (e) => {
      this.deps.setAutopilot((e.target as HTMLInputElement).checked);
    });
    bar.querySelector("#hb-fold")!.addEventListener("click", () => {
      bar.classList.toggle("folded");
      bar.querySelector("#hb-fold")!.textContent = bar.classList.contains("folded") ? "▸" : "▾";
    });
    return bar;
  }

  private buildOverlay(): HTMLElement {
    const ov = document.createElement("div");
    ov.id = "record-overlay";
    ov.className = "hidden";
    ov.innerHTML = `
      <h1>翻訳の全記録</h1>
      <p class="ro-sub">左は皆さんの<b>言葉</b>。右はゲームエンジンが読んだ<b>設計図</b>。<br/>
      プログラミングの知識は1ミリも要らなかった — 必要だったのは、頭の中の景色を言葉に切り分ける力だけ。</p>
      <div id="ro-rows"></div>
      <p class="ro-close">クリック または Rキーで閉じる</p>`;
    ov.addEventListener("click", () => this.showOverlay(false));
    return ov;
  }

  // ---- 描画 ----

  private showOverlay(show: boolean): void {
    this.overlay.classList.toggle("hidden", !show);
    if (show) this.renderOverlay();
  }

  private renderTimer(): void {
    const el = this.bar.querySelector("#hb-timer")!;
    const plan = PHASE_PLAN[this.phase];
    if (!plan) {
      el.textContent = "";
      return;
    }
    const remain = plan - Math.floor((Date.now() - this.phaseStartedAt) / 1000);
    const abs = Math.abs(remain);
    const mmss = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
    el.textContent = remain >= 0 ? `残り ${mmss}` : `超過 +${mmss}`;
    el.className = remain < 0 ? "over" : "";
  }

  private recordHtml(rec: TranslationRecord, compact: boolean): string {
    const role = this.roleOf.get(rec.author);
    const color = role ? ROLE_INFO[role as "A" | "B" | "C"].color : "#888";
    const engine = rec.engine === "ai" ? "🤖" : rec.engine === "dict" ? "📖" : "";
    const logs = compact ? rec.translationLog.slice(0, 2) : rec.translationLog;
    return `
      <div class="rec-row">
        <div class="rec-left">
          <span class="rec-author" style="color:${color}">${role ?? "?"}・${esc(rec.author)} ${engine}</span>
          <div class="rec-text">「${esc(rec.sourceText)}」</div>
        </div>
        <div class="rec-arrow">→</div>
        <div class="rec-right">${logs.map((l) => `<code>${esc(l)}</code>`).join("")}</div>
      </div>`;
  }

  private renderRecords(): void {
    const list = this.bar.querySelector("#hb-records")!;
    list.innerHTML = this.records
      .slice(-6)
      .reverse()
      .map((r) => this.recordHtml(r, true))
      .join("");
  }

  private renderOverlay(): void {
    this.overlay.querySelector("#ro-rows")!.innerHTML = this.records.length
      ? this.records.map((r) => this.recordHtml(r, false)).join("")
      : `<p class="hb-empty">まだ記録がありません</p>`;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}
