import type { StageParams } from "./StageParams";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type ParamsPatch = DeepPartial<StageParams>;
type Listener = (params: StageParams, patch: ParamsPatch) => void;

// StageParams の正本。Step 3 以降は Durable Object 側が正本になり、
// このストアは params_patch メッセージの受け口に変わる（インターフェースは不変）。
export class ParamStore {
  readonly params: StageParams;
  private listeners: Listener[] = [];

  constructor(initial: StageParams) {
    this.params = structuredClone(initial);
  }

  patch(p: ParamsPatch): void {
    deepMerge(this.params as unknown as Record<string, unknown>, p as Record<string, unknown>);
    for (const fn of this.listeners) fn(this.params, p);
  }

  onChange(fn: Listener): void {
    this.listeners.push(fn);
  }
}

// 配列は丸ごと置換、オブジェクトは再帰マージ
function deepMerge(target: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const key of Object.keys(src)) {
    const sv = src[key];
    const tv = target[key];
    if (sv !== null && typeof sv === "object" && !Array.isArray(sv) &&
        tv !== null && typeof tv === "object" && !Array.isArray(tv)) {
      deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      target[key] = Array.isArray(sv) ? structuredClone(sv) : sv;
    }
  }
}
