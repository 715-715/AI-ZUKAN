-- ============================================================
-- AI美女図鑑 - Supabase スキーマ
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて実行してください
-- ============================================================

-- プロフィールテーブル
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  catalog_no text,
  bio text,
  tags text[] not null default '{}',
  cover_url text,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- メディア（写真・動画）テーブル
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  url text not null,
  -- 'free'  : 誰でも閲覧可（会員登録不要）
  -- 'member': 有料会員のみ閲覧可
  access_level text not null default 'member' check (access_level in ('free', 'member')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 会員のサブスクリプション状態（CCBillと同期）
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ccbill_subscription_id text unique,
  status text not null default 'inactive'
    check (status in ('active', 'cancelled', 'expired', 'inactive')),
  plan text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);

-- updated_at を自動更新するトリガー
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ============================================================
-- 管理者テーブル
-- 「ログイン済みなら誰でも管理者」ではなく、このテーブルに
-- 登録されたuser_idだけが投稿管理・会員データの閲覧を行えます。
-- 一般会員（サブスク購入者）とサイト運営者を明確に分離するためです。
-- ============================================================

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$ language sql stable security definer;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table media enable row level security;
alter table subscriptions enable row level security;
alter table admins enable row level security;

-- --- profiles ---

-- 誰でも「公開済み」のプロフィールだけ閲覧できる
create policy "public can read published profiles"
  on profiles for select
  using (is_published = true);

-- 管理者は全件閲覧・追加・更新・削除できる
create policy "admin can read all profiles"
  on profiles for select
  to authenticated
  using (is_admin());

create policy "admin can insert profiles"
  on profiles for insert
  to authenticated
  with check (is_admin());

create policy "admin can update profiles"
  on profiles for update
  to authenticated
  using (is_admin());

create policy "admin can delete profiles"
  on profiles for delete
  to authenticated
  using (is_admin());

-- --- media ---

-- 無料公開メディアは「紐づくプロフィールが公開済み」なら誰でも閲覧可
create policy "public can read free media of published profiles"
  on media for select
  using (
    access_level = 'free'
    and exists (
      select 1 from profiles
      where profiles.id = media.profile_id
      and profiles.is_published = true
    )
  );

-- 会員限定メディアは「有効なサブスクを持つログイン済みユーザー」のみ閲覧可
create policy "active member can read member media"
  on media for select
  to authenticated
  using (
    access_level = 'member'
    and exists (
      select 1 from profiles
      where profiles.id = media.profile_id
      and profiles.is_published = true
    )
    and exists (
      select 1 from subscriptions
      where subscriptions.user_id = auth.uid()
      and subscriptions.status = 'active'
    )
  );

create policy "admin can read all media"
  on media for select
  to authenticated
  using (is_admin());

create policy "admin can insert media"
  on media for insert
  to authenticated
  with check (is_admin());

create policy "admin can update media"
  on media for update
  to authenticated
  using (is_admin());

create policy "admin can delete media"
  on media for delete
  to authenticated
  using (is_admin());

-- --- subscriptions ---

-- 本人は自分のサブスク状態だけ閲覧できる
create policy "user can read own subscription"
  on subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- 管理者は全会員のサブスク状態を閲覧できる
create policy "admin can read all subscriptions"
  on subscriptions for select
  to authenticated
  using (is_admin());

-- subscriptionsへの書き込みはCCBill Webhook（service_roleキー使用）からのみ行うため、
-- authenticatedロール向けのinsert/update/deleteポリシーはあえて用意していません。

-- --- admins ---

create policy "admin can read admins list"
  on admins for select
  to authenticated
  using (is_admin());

-- ============================================================
-- Storage（画像・動画の保存バケット）
-- ダッシュボードの「Storage」から先に "media" という名前で
-- Public バケットを1つ作成してから、以下を実行してください
-- ============================================================

-- 実ファイルはバケット単位でしか制御できないため、
-- 「無料/会員限定」の出し分けはアプリ側（署名付きURLではなく公開URLだが、
-- media.access_levelとRLSで一覧・詳細ページ表示を制御）で行います。
create policy "public can read media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "admin can upload to media bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and is_admin());

create policy "admin can update media bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and is_admin());

create policy "admin can delete from media bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and is_admin());
