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

## 現在の進捗: Step 5+6 — ホスト操作パネル / リハーサルツール（全ステップ完了🎉）

**Step 5: ホスト運営機能**
- **ホスト操作パネル**（画面左下）: フェーズ進行ボタン＋推奨残り時間タイマー、入力カンペ
  （誰が何を入力しどう翻訳されたか、🤖AI/📖辞書の別つき）、⚡強制ビルド、🤖デモ自動走行
- **翻訳の全記録**（Rキー or 🎓解説フェーズで自動投影）: 左に言葉・右にパラメータの対応表。
  研修の学び（設計書2.2）をそのまま投影できる
- スマホに解説フェーズ画面を追加。`#demo-records` でスタイル確認可

**Step 6: アセット＆リハーサル**
- 敵キャラに目・ハイライト等のディテール、背景に窓明かり・雲・月などの装飾を追加
- **自動リハーサル** `npm run rehearsal`（仮想参加者3名がフルセッションを演技。
  `FAST=1 AUTO=1` で1分検証、本番URLにも実行可）
- **会場用LANモード** `npm run dev:lan`（Wi-Fi制限時のプランB）
- **進行キューシート** [docs/REHEARSAL.md](docs/REHEARSAL.md): 10分タイムライン・チェックリスト・トラブル対処

## Step 4 — AI翻訳（Claude API）

- **AI翻訳** (`worker/aiTranslate.ts`): `claude-haiku-4-5` + tool use強制（`tool_choice` + strictスキーマ）で
  「言葉 → StageParamsパッチ + 翻訳ログ + 翻訳意図note」を生成。タイムアウト3.5秒
- **二段構え**: AI失敗/タイムアウト/未課金時は辞書翻訳に即フォールバック。体験は途切れない
- `params_patch` に `engine: "ai" | "dict"` が付くので、どちらが訳したか追跡可能（`npx wrangler tail` でエラー監視）
- 検証: `SMOKE_AI=1 SMOKE_URL=wss://... node scripts/smoke.mjs` でAI経路、なしで辞書経路をテスト
- **要件**: Workersシークレット `ANTHROPIC_API_KEY` + AnthropicアカウントのAPIクレジット残高

## Step 3 — 通信層（Durable Object + スマホUI）

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
| 4 | AI翻訳Worker（Claude API） | ✅ |
| 5 | ホスト操作パネル + 翻訳の全記録画面 | ✅ |
| 6 | アセット制作 & リハーサル | ✅ |
