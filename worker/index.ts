import { RoomDO } from "./RoomDO";

export { RoomDO };

export interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string; // wrangler secret。未設定時は辞書翻訳のみで動く
}

// ルーティング: /ws/:roomCode → Durable Object（WebSocket）、それ以外 → 静的アセット
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/ws\/([a-zA-Z0-9]{4,8})$/);
    if (m) {
      const id = env.ROOM.idFromName(m[1].toUpperCase());
      return env.ROOM.get(id).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
