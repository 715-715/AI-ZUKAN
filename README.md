# AI美女図鑑

AIモデルのプロフィールを「図鑑」形式で公開するサイト。公開側の一覧・詳細ページと、
自分専用（将来は複数人）の裏側投稿管理画面、そして会員登録+CCBill決済によるメンバーシップで構成されています。

## 構成

**公開側**
- `/` … 一覧ページ（公開設定したプロフィールのみ表示）
- `/profile/[id]` … 詳細ページ（無料公開メディアは誰でも、会員限定メディアは有効な会員のみ閲覧可）
- `/signup` `/login` … 一般会員のサインアップ・ログイン
- `/join` … 入会ページ（CCBillチェックアウトへ）
- `/account` … マイページ（会員ステータス確認）
- `/terms` `/privacy` `/tokushoho` … 規約系ページ（雛形。公開前に要編集）

**管理側**（`admins`テーブルに登録されたユーザーのみアクセス可）
- `/admin/login` … 管理画面ログイン
- `/admin` … 投稿一覧・公開/非公開切り替え・削除
- `/admin/new` `/admin/[id]/edit` … プロフィール登録・編集（写真・動画は「無料公開／会員限定」を個別に設定可能）

**サーバー**
- `/api/ccbill/webhook` … CCBillからの購入・解約・失効通知を受けてDBの会員ステータスを同期

技術構成: Next.js（App Router）+ Supabase（DB / 認証 / ストレージ / RLS）+ CCBill（決済）。Vercelにそのままデプロイできます。

---

## セットアップ手順

### 1. Supabaseプロジェクトを作成

1. https://supabase.com で無料プロジェクトを作成
2. 左メニュー「Storage」で `media` という名前の **Public** バケットを作成
3. 左メニュー「SQL Editor」を開き、`supabase/schema.sql` の中身を貼り付けて実行
4. 「Authentication」→「Users」から、自分用の**管理者アカウント**を1つ作成
   （メールアドレス＋パスワード。「Auto Confirm User」を有効にすると確認メール不要で即ログイン可）
5. 同じくSQL Editorで、作成した管理者アカウントを `admins` テーブルに登録します
   （Authenticationの「Users」一覧からUUIDをコピーしてください）:
   ```sql
   insert into admins (user_id) values ('コピーしたUUID');
   ```
   ⚠️ これをやらないと、ログインできても管理画面でデータの読み書きができません
   （一般会員と管理者を区別するためのRLS設計のためです）。
6. 「Settings」→「API」から Project URL / anon public キー / **service_role キー** をコピー

### 2. 環境変数を設定

```bash
cp .env.local.example .env.local
```

Supabaseの値を入力。CCBill関連（`CCBILL_*`）は審査通過後、管理画面から取得できます。
それまでは空のままでもサイト・管理画面は動作します（`/join`ページのボタンだけ「設定未完了」と表示されます）。

### 3. インストール・起動

```bash
npm install
npm run dev
```

### 4. デプロイ（Vercel）

1. GitHubにpush → Vercelでインポート
2. `.env.local` と同じ環境変数をVercelに設定（`SUPABASE_SERVICE_ROLE_KEY`は絶対に`NEXT_PUBLIC_`を付けない）
3. デプロイ

---

## CCBill審査通過後にやること

1. CCBill管理画面でサブアカウント作成 → FlexFormを1つ作成し、Dynamic Pricingを有効化
2. サブアカウントの「Webhooks」設定で、通知先URLに
   `https://あなたのドメイン/api/ccbill/webhook` を登録し、形式は
   「URL Encoded」を選択（`NewSaleSuccess` `RenewalSuccess` `Cancellation` `Expiration` `ChargeBack` を有効化）
3. `.env.local`（本番はVercelの環境変数）に `CCBILL_CLIENT_ACCNUM` `CCBILL_CLIENT_SUBACC`
   `CCBILL_FLEXFORM_ID` `CCBILL_SALT` `NEXT_PUBLIC_SITE_URL` を設定
4. **重要**: `lib/ccbill.js` 内の formDigest 計算式は一般的な継続課金の例です。
   CCBill管理画面の「Dynamic Pricing User Guide」で、自分のサブアカウントの
   価格設定タイプに合った連結順序かを必ず確認し、CCBillのテストカードで
   決済テストを1回行ってから本番公開してください（金額に関わる部分のため）。
5. `/terms` `/privacy` `/tokushoho` の（　）部分を、開業届提出後の正式な屋号・氏名・所在地に差し替え

## 決済まわりのUX（摩擦を減らす工夫）

`/join` ページはCCBillのチェックアウトを**iframeで自サイト内に埋め込み**表示しています
（完全に別サイトへ飛ばされる違和感を減らすため）。決済完了・失敗後は
`approvalUrl` / `declineUrl` 経由でそれぞれ `/join/success` `/join/declined`
（自サイト内のページ）に戻ってくるようにしています。

⚠️ 確認事項:
- CCBillの管理画面（サブアカウント設定）側でも、Approval/Decline時の
  リダイレクト先URLの登録が必要な場合があります。`NEXT_PUBLIC_SITE_URL`
  と同じドメインを設定してください
- iframe内で決済処理をすると、まれに「iframe内のまま」戻り先URLに
  遷移してしまい、見た目が崩れることがあります（ブラウザやCCBill側の
  セキュリティ設定による）。本番公開前に実際の決済フローを一度最後まで
  確認し、崩れる場合は「決済ページのみ新しいタブで開く」方式
  （`target="_blank"`のリンクに変更）に切り替えるのが簡単な回避策です
- 一度サブスクリプションに加入すれば、CCBill側でカード情報が保持され、
  2回目以降の更新（rebill）はユーザーの再入力なしで自動課金されます
  （`numRebills`で設定した回数まで）

## 会員限定コンテンツの制御について（重要な制約）

`media.access_level` と Supabase の RLS（Row Level Security）で、一覧・詳細ページに
「どのメディアを表示するか」を制御しています。ただしStorageバケットは
Public設定のため、会員限定メディアのファイルURL自体（UUIDを含む推測困難な長いURL）を
第三者が直接知っていれば、理論上はアクセスされ得ます。
本格的に厳密なアクセス制御（署名付きURLの都度発行など）が必要になった場合は
追加で相談してください。

## 運用メモ

- **プロフィール追加**: `/admin/new` でカバー写真・プロフィール文・タグを入力し、
  写真/動画を選択（アップロードごとに「会員限定／無料公開」を選べます）。
  保存後は下書き状態なので、確認してから一覧の「公開する」を押してください。
- **複数人での投稿**: `admins` テーブルに追加したいユーザーのUUIDをinsertするだけで管理者を追加できます。
- **動画容量**: Supabase無料枠はストレージ1GB・転送量月2GBまで。
  数百件規模での本格運用は、有料プラン（Proは月$25〜で100GBストレージ）を想定してください。
