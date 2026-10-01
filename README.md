# 筋トレ管理アプリ（スマホ版）

要件定義書 v1.2（UI詳細版）に基づく、自宅筋トレ向けの PWA です。スマホ幅（最大 430px）専用のレイアウトです。

- 筋トレ記録（テンプレート・前回値引き継ぎ・セット完了で自動インターバル）
- インターバルタイマー（別画面でも継続、終了時に音・振動・通知）
- 曜日スケジュール／カレンダー／スタンプ・ストリーク・バッジ
- 食事・カロリー（PFC、食品検索・バーコード入力、摂取／消費の推移）
- 月次身体記録（身長・体重・BMI・体脂肪率・筋肉量・ウエスト・写真 3 方向）、写真比較（並べる／スライダー／タイムラプス）
- 分析（筋肉疲労度マップ、月間集計、前月比較、AI 月次レポート）
- 種目ごとの自己ベスト（推定 1RM）と次回目標の提案、自己ベスト更新トースト
- ログイン（メール＋パスワード／メールリンク／Google）とクラウド同期・写真のクラウド保存
- Web Push（アプリを閉じていても届く予定通知・インターバル終了通知）
- JSON バックアップ／復元、CSV 書き出し（筋トレ・食事・身体）

外部サービスはすべて任意です。何も設定しなければ、端末内（localStorage / IndexedDB）だけで動作します。

## 起動方法

```bash
npm install
npm run dev          # 開発: http://localhost:3000
# 本番ビルド
npm run build && npm start
```

スマホ実機で試す場合は、同じ Wi-Fi で `http://<PCのIP>:3000` を開きます。通知・カメラ・PWA のインストールには HTTPS が必要なので、本格的に使う場合は後述のデプロイを行ってください。

## 1. クラウド保存（Supabase）

### ローカルで動かす（Docker が必要）

```bash
npx supabase start      # 初回はイメージ取得に数分かかります
npx supabase status     # URL / anon key / service_role key を確認
```

`.env.example` を `.env.local` にコピーし、`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`・`SUPABASE_SERVICE_ROLE_KEY` を設定します。
スキーマは `supabase/migrations/` にあり、`supabase start` / `supabase db reset` で自動適用されます。

- Studio: http://127.0.0.1:54323
- 確認メール（Mailpit）: http://127.0.0.1:54324

### 本番（supabase.com）

1. プロジェクトを作成し、`npx supabase link --project-ref <ref>` → `npx supabase db push` でスキーマを適用
2. Authentication → URL Configuration の Site URL / Redirect URLs に本番 URL（`https://<domain>/login`）を追加
3. Google ログインを使う場合は Authentication → Providers で Google を有効化し、`NEXT_PUBLIC_AUTH_GOOGLE=true`

### データの扱い

- すべてのテーブルに RLS（本人の行のみ読み書き可）を設定
- 身体写真は非公開バケット `photos` の `<user_id>/...` に保存し、本人のみアクセス可能
- 同期は「ローカル優先」です。オフラインでも記録でき、オンライン復帰・アプリ復帰時・60 秒ごとに差分を送受信します
- ローカルにもクラウドにもデータがある状態で初めてログインした場合は、どちらを使うか選択できます

## 2. Web Push 通知

```bash
npx web-push generate-vapid-keys
```

出力された鍵を `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` に、ランダムな文字列を `CRON_SECRET` に設定します。アプリの「設定 → 通知 → プッシュ通知」をオンにすると購読されます（iPhone はホーム画面に追加した PWA からのみ利用可能）。

送信の仕組み:

- インターバル終了: タイマー開始時にサーバーへ予約し、終了時刻に送信（5 分以内のタイマーはリクエスト内で正確に送信）
- 予定・身体記録・食事記録忘れ: 設定時刻を過ぎたら 1 日 1 回（身体記録は月 1 回）送信

`next start` で常駐させる場合は、サーバー内のスケジューラが 10 秒ごとに判定するため追加設定は不要です。
Vercel などのサーバーレス環境では、`GET /api/push/cron` を **1〜5 分ごと** に呼び出してください（`Authorization: Bearer <CRON_SECRET>`）。
Supabase の pg_cron を使う例:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('kintore-push', '* * * * *', $$
  select net.http_get(
    url := 'https://<your-domain>/api/push/cron',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

Supabase を設定していない場合、購読情報は `.data/push.json` に保存されます（常駐サーバー向け）。

## 3. AI 月次レポート

`AI_API_KEY`（と必要なら `AI_BASE_URL` / `AI_MODEL`）を設定すると、分析画面の「生成」で外部 AI によるレポートを作成します。OpenAI 互換の Chat Completions API であれば利用できます。

- 送信するのは月間の集計値（回数・セット数・消費カロリー・体重/BMI・部位別セット数・疲労度上位など）のみで、写真・メモ・ニックネームは送信しません
- 未設定・エラー・オフライン時はアプリ内の定型レポートに自動で切り替わります

## 4. 食品検索・バーコード

食事記録の「食品を検索」から、内蔵の日本の定番食品リスト（目安値）と Open Food Facts（ODbL）の商品データを検索できます。バーコード読み取りは BarcodeDetector 対応ブラウザ（Android の Chrome など）で利用でき、非対応の場合は JAN コードを手入力できます。

## デプロイ（例: Vercel + Supabase）

1. このリポジトリを Vercel にインポート
2. Environment Variables に `.env.example` の項目を設定
3. Supabase 側の Redirect URLs に Vercel の URL を追加
4. 上記の cron（pg_cron や外部 cron サービス）を設定

## 開発メモ

```bash
npx tsc --noEmit     # 型チェック
npm run lint         # ESLint
npx supabase db reset  # ローカル DB をマイグレーションから作り直す
```

## 制限事項

- Apple ヘルスケア / Google Fit の歩数・体重の自動取り込みは、Web アプリからは OS の API にアクセスできないため未対応です（ネイティブアプリ化が必要）
- iPhone の Web Push は iOS 16.4 以降、ホーム画面に追加した場合のみ動作します
- 消費カロリー・筋肉疲労度・推定 1RM は概算値です。医療的な判断には使用しないでください
