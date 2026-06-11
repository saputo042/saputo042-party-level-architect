import type { PromptCard, Role } from "./protocol";

// お題カード（設計書 1.2 Phase 2）。サーバが join 時に役割分のカードを配る。

export const PROMPT_CARDS: Record<Role, PromptCard[]> = {
  A: [
    {
      id: "a1",
      title: "この世界の舞台はどんな場所？",
      hint: "例: ネオン輝くディスコ / 真夜中の屋上 / 南国のビーチ",
      kind: "text",
    },
    {
      id: "a2",
      title: "この世界に流れる音楽は？",
      hint: "例: アップテンポなEDM / ゆったりローファイ / ノリノリのファンク",
      kind: "text",
    },
    {
      id: "a3",
      title: "このゲームのスピード感は？",
      hint: "例: 嵐みたいにハイスピード / お散歩みたいにゆったり",
      kind: "text",
    },
  ],
  B: [
    {
      id: "b1",
      title: "行く手を阻む敵はどんな姿？",
      hint: "例: 跳ね回るスライムドリンク / ふわふわ漂うおばけケーキ",
      kind: "text",
    },
    {
      id: "b2",
      title: "その敵はどう動く？",
      hint: "例: ぴょんぴょん跳ねる / ぐるぐる回る / しつこく追いかけてくる",
      kind: "text",
    },
    {
      id: "b3",
      title: "ステージにトラップを仕掛けよう！",
      hint: "スタンプを選んで、マップの置きたい場所をタップ",
      kind: "stamp",
    },
  ],
  C: [
    {
      id: "c1",
      title: "スコアや体力の表示はどんなデザイン？",
      hint: "例: ポップアート風 / 高級ホテル風 / 手書き風 / サイバー風",
      kind: "text",
    },
    {
      id: "c2",
      title: "ジャンプの瞬間、画面に何が舞う？",
      hint: "例: 画面を埋め尽くす紙吹雪 / きらきらの星屑 / シャボン玉",
      kind: "text",
    },
    {
      id: "c3",
      title: "クリアの瞬間の最高の演出は？",
      hint: "例: 夜空いっぱいの花火 / 虹色の波 / ディスコ・ドロップ",
      kind: "text",
    },
  ],
};

export const ROLE_INFO: Record<Role, { label: string; desc: string; color: string }> = {
  A: {
    label: "環境とテンポの設計者",
    desc: "この世界の空気と、心臓の速さは、あなたが決める",
    color: "#05d9e8",
  },
  B: {
    label: "敵とギミックの設計者",
    desc: "この世界の障害と、驚きは、あなたが決める",
    color: "#ff2a6d",
  },
  C: {
    label: "UIとエフェクトの設計者",
    desc: "この世界の手触りと、輝きは、あなたが決める",
    color: "#ffd700",
  },
};
