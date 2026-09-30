-- ============================================================
-- ゲーム用テーブル（キャラクター・シナリオ・セーブデータ）
-- Supabase の SQL Editor に貼り付けて実行してください。
-- ※ 先に supabase/schema.sql（is_admin() / set_updated_at() を含む）を実行済みであること
-- ============================================================

create table if not exists game_characters (
  id text primary key,
  name text not null,
  emoji text not null default '🙂',
  tagline text not null default '',
  fav_skill text not null default 'intelligence'
    check (fav_skill in ('intelligence','sensibility','passion','muscle','looks','curiosity')),
  face_url text,
  -- 日常会話（LINE）の一言: [{ "line": "...", "narration": "...", "win": true }]
  pool jsonb not null default '[]',
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  char_id text not null references game_characters(id) on delete cascade,
  scene text not null default 'line' check (scene in ('line','date','home')),
  stop int not null default 0,
  min_affection int not null default 0,
  once boolean not null default true,
  enabled boolean not null default true,
  -- ページ配列: [{ id, speaker, text, media:{url,type}|null, after, ending, choices:[{label,next,delta}] }]
  pages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ユーザーごとのセーブデータ
create table if not exists game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_game_characters_updated_at on game_characters;
create trigger trg_game_characters_updated_at before update on game_characters
  for each row execute function set_updated_at();
drop trigger if exists trg_game_scenarios_updated_at on game_scenarios;
create trigger trg_game_scenarios_updated_at before update on game_scenarios
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table game_characters enable row level security;
alter table game_scenarios enable row level security;
alter table game_saves enable row level security;

-- キャラ・シナリオ: ログイン済みなら公開分を閲覧可 / 管理者は全操作可
create policy "authenticated can read published characters" on game_characters
  for select to authenticated using (is_published or is_admin());
create policy "admin can insert characters" on game_characters
  for insert to authenticated with check (is_admin());
create policy "admin can update characters" on game_characters
  for update to authenticated using (is_admin());
create policy "admin can delete characters" on game_characters
  for delete to authenticated using (is_admin());

create policy "authenticated can read enabled scenarios" on game_scenarios
  for select to authenticated using (enabled or is_admin());
create policy "admin can insert scenarios" on game_scenarios
  for insert to authenticated with check (is_admin());
create policy "admin can update scenarios" on game_scenarios
  for update to authenticated using (is_admin());
create policy "admin can delete scenarios" on game_scenarios
  for delete to authenticated using (is_admin());

-- セーブ: 本人のみ
create policy "user can read own save" on game_saves
  for select to authenticated using (user_id = auth.uid());
create policy "user can insert own save" on game_saves
  for insert to authenticated with check (user_id = auth.uid());
create policy "user can update own save" on game_saves
  for update to authenticated using (user_id = auth.uid());
create policy "user can delete own save" on game_saves
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 初期データ（キャラ5人＋サンプルシナリオ1本）。不要なら管理画面から削除できます
-- ============================================================

insert into game_characters (id,name,emoji,tagline,fav_skill,pool,sort_order) values ('hina','雛','🌸','物静かで読書好き','intelligence','[{"line": "今日は静かに過ごしていたようだ", "narration": "", "win": false}, {"line": "「{name}さんは、休日は何をしているんですか？」と聞かれた", "narration": "心を開いてくれつつある", "win": true}, {"line": "ふと窓の外を眺めていた", "narration": "", "win": false}]'::jsonb,1) on conflict (id) do nothing;
insert into game_characters (id,name,emoji,tagline,fav_skill,pool,sort_order) values ('riko','璃子','🌊','アクティブで社交的','muscle','[{"line": "今日はジムに行っていたらしい", "narration": "", "win": false}, {"line": "「{name}さん、今度一緒に運動しません？」と誘われた", "narration": "打ち解けてきた", "win": true}, {"line": "友人と出かけていたようだ", "narration": "", "win": false}]'::jsonb,2) on conflict (id) do nothing;
insert into game_characters (id,name,emoji,tagline,fav_skill,pool,sort_order) values ('mei','芽依','🎨','絵を描くのが趣味','sensibility','[{"line": "新しいスケッチを見せてくれた", "narration": "", "win": false}, {"line": "「{name}さんをモデルに描いてみたいです」と呟いていた", "narration": "距離が縮まった", "win": true}, {"line": "静かに作業に没頭していた", "narration": "", "win": false}]'::jsonb,3) on conflict (id) do nothing;
insert into game_characters (id,name,emoji,tagline,fav_skill,pool,sort_order) values ('nana','奈々','🎵','音楽が好きな明るい性格','passion','[{"line": "鼻歌を歌いながら過ごしていた", "narration": "", "win": false}, {"line": "「{name}さんの好きな曲、今度教えてください」と言われた", "narration": "打ち解けてきた", "win": true}, {"line": "ライブの話を楽しそうにしていた", "narration": "", "win": false}]'::jsonb,4) on conflict (id) do nothing;
insert into game_characters (id,name,emoji,tagline,fav_skill,pool,sort_order) values ('sora','空','☁️','のんびり屋の天然系','looks','[{"line": "昼寝をしていたらしい", "narration": "", "win": false}, {"line": "「{name}さんといると落ち着きます」とぽつり", "narration": "心を開いてくれつつある", "win": true}, {"line": "何をするでもなくぼーっとしていた", "narration": "", "win": false}]'::jsonb,5) on conflict (id) do nothing;

insert into game_scenarios (title,char_id,scene,stop,min_affection,once,enabled,pages)
select '本を貸してくれる','hina','line',0,26,true,true,'[{"id": "p1", "speaker": "char", "text": "{name}さん、今度おすすめの本を貸してもいいですか？", "media": null, "after": "end", "ending": "", "choices": [{"label": "ぜひ貸してほしい", "next": "p2", "delta": 5}, {"label": "今は忙しくて…", "next": "p3", "delta": -2}]}, {"id": "p2", "speaker": "char", "text": "よかった…！どこで読みましょうか？", "media": null, "after": "end", "ending": "", "choices": [{"label": "図書館で一緒に読もう", "next": "p4", "delta": 4}, {"label": "家でゆっくり読むよ", "next": "p5", "delta": 2}]}, {"id": "p3", "speaker": "char", "text": "そうですよね…また誘っても、いいですか？", "media": null, "after": "end", "ending": "", "choices": [{"label": "もちろん、また声をかけて", "next": "p6", "delta": 1}, {"label": "（何も答えない）", "next": "p7", "delta": -3}]}, {"id": "p4", "speaker": "char", "text": "静かな席で、隣に座って一冊を一緒にめくった。", "media": null, "after": "end", "ending": "図書館ルート", "choices": []}, {"id": "p5", "speaker": "char", "text": "「感想、聞かせてくださいね」と嬉しそうに笑った。", "media": null, "after": "end", "ending": "読書ルート", "choices": []}, {"id": "p6", "speaker": "char", "text": "「じゃあ、また今度」と小さく手を振ってくれた。", "media": null, "after": "end", "ending": "再挑戦ルート", "choices": []}, {"id": "p7", "speaker": "char", "text": "気まずい沈黙のまま、会話は終わった。", "media": null, "after": "end", "ending": "すれ違いルート", "choices": []}]'::jsonb
where not exists (select 1 from game_scenarios where title='本を貸してくれる' and char_id='hina');
