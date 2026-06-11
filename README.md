# Party Level Architect

「言葉」と「配置」だけで、大画面に動くゲームを10分で誕生させる社内研修DX体験。
設計の全体像は [docs/PRODUCT_DESIGN.md](docs/PRODUCT_DESIGN.md) を参照。

**公開URL:** https://party-level-architect.takanori20040402.workers.dev
（`npm run deploy` でCloudflare Workersに反映。WebSocket対応のためPagesからWorkers+静的アセットに移行済み）

## 遊び方（リアルタイムセッション）

1. ホストPC: `/?host` を開く → QRコードとルームコードが表示される
2. 参加者: スマホでQRを読む → 名前を入れて参加 → 役割カード（A/B/C）が配られる
3. ホストが「スタート」→ 各自のお題カードに言葉で回答（Bの3問目はスタンプ配置）
4. 全お題完了 → 3人同時にBUILDボタン長押し → メインスクリーンでビルド演出 → ゲーム起動

## 現在の進捗: Step 3 — 通信層（Durable Object + スマホUI）

- **RoomDO**: 1ルーム=1 Durable Object。join/役割配布/翻訳/スタンプ/BUILD同時長押し/歓声（`worker/RoomDO.ts`）
- **辞書翻訳**: キーワード辞書で言葉→StageParamsパッチ+翻訳ログ（`shared/translate.ts`、Step 4でClaude APIが主役になりこれは保険に回る）
- **スマホUI**: 参加→役割カードリバール→お題カード→スタンプ配置→BUILD長押し→歓声（`/mobile`）
- **ホスト統合**: QRロビー、params_patch受信→マテリアライズ儀式、ビルド充電ゲージ、絵文字歓声
- **スモークテスト**: `npx wrangler dev` 起動後に `node scripts/smoke.mjs`（本番は `SMOKE_URL=wss://... node scripts/smoke.mjs`）

## Step 2 — マテリアライズ演出 + ビルドシーケンス

「言葉が世界になる瞬間」の儀式化が完成。

- **マテリアライズ**: 入力文言が光の粒と共に飛来 → パラメータへ分解される翻訳ログ → 波紋と共に世界へ反映 + 「by 名前」タグ
- **ビルド**: 世界が粒子に分解 → 入力文言入り翻訳ログの高速流し + プログレスバー → ホワイトアウト → 息を呑む無音0.5秒 → タイトルドロップ + BGM開幕
- デバッグパネルの「Input Simulator」から役割別サンプル入力9種を送信可能
- デモ用ハッシュ: `#party`（完成形即適用）/ `#demo-materialize` / `#demo-build`（通し再生）
- `?headless` クエリでsetTimeoutゲームループに切替（ヘッドレスブラウザ自動検証用）

## Step 1 — パラメータ駆動ステージ

ゲームの全状態を単一の `StageParams` スキーマに集約し、デバッグパネル（lil-gui）から
全パラメータをリアルタイムに変更できる横スクロールステージ。

- 環境: パレット / 背景 / 霧・星・レーザー / BGMジャンル・BPM（プロシージャル生成）/ スクロール速度 / 重力
- 敵: アーキタイプ5種 × スキン5種 × tint × 挙動パラメータ × 数
- ギミック: ミラーボール / スプリングパッド / 紙吹雪キャノン / スリップ床 / スポットライト
- UI: テーマ5種（DOMオーバーレイHUD）/ パーティクル5種 / フィナーレ演出3種

操作: **スペースキー or クリックでジャンプ**。BGMは最初のクリック/キー入力後に再生開始。

## 起動

```bash
npm install
npm run dev   # http://localhost:5173
```

## ロードマップ

| Step | 内容 | 状態 |
|---|---|---|
| 1 | StageParams → 画面の変換層 + デバッグパネル | ✅ |
| 2 | マテリアライズ演出 + ビルドシーケンス | ✅ |
| 3 | 通信層（Cloudflare Durable Object + スマホUI） | ✅ |
| 4 | AI翻訳Worker（Claude API） | 未着手 |
| 5 | ホスト操作パネル + 翻訳の全記録画面 | 未着手 |
| 6 | アセット制作 & リハーサル | 未着手 |
