import type { StageParams, UiTheme } from "../params/StageParams";

// HUDはDOMオーバーレイ。ui.themeはCSSクラス、accentColorはCSS変数として反映する。
export class Hud {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private scoreEl: HTMLElement;
  private hpEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = container;
    this.root.innerHTML = `
      <div class="hud-title"></div>
      <div class="hud-score">SCORE <span>0</span></div>
      <div class="hud-hp"></div>
    `;
    this.titleEl = this.root.querySelector(".hud-title")!;
    this.scoreEl = this.root.querySelector(".hud-score span")!;
    this.hpEl = this.root.querySelector(".hud-hp")!;
    this.setHp(3);
  }

  apply(ui: StageParams["ui"], meta: StageParams["meta"]): void {
    this.root.className = `theme-${ui.theme satisfies UiTheme}`;
    this.root.style.setProperty("--accent", ui.accentColor);
    this.titleEl.textContent = meta.title;
  }

  setScore(v: number): void {
    this.scoreEl.textContent = String(v);
  }

  setHp(v: number): void {
    this.hpEl.textContent = "♥".repeat(v) + "♡".repeat(Math.max(0, 3 - v));
  }
}
