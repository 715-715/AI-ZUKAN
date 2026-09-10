import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 0;

export default async function ProfileDetailPage({ params }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("is_published", true)
    .single();

  if (!profile) notFound();

  // RLSにより、ログインしていない/会員でないユーザーには
  // access_level='member'のメディアはそもそも返ってこない
  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("profile_id", params.id)
    .order("sort_order", { ascending: true });

  let isActiveMember = false;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    isActiveMember = Boolean(sub);
  }

  return (
    <div className="admin-shell">
      <header className="site-header">
        <Link href="/" className="site-title">
          AI美女図鑑
          <small>An Illustrated Catalogue</small>
        </Link>
        <nav className="site-nav" style={{ display: "flex", gap: 18 }}>
          <Link href="/">一覧へ戻る</Link>
          {!isActiveMember && <Link href="/join">会員登録</Link>}
        </nav>
      </header>

      <div className="container">
        <div className="entry-header">
          <div className="entry-photo">
            {profile.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.cover_url} alt={profile.name} />
            )}
          </div>
          <div>
            <div className="entry-index">No.{profile.catalog_no ?? "—"}</div>
            <h1 className="entry-name">{profile.name}</h1>
            {profile.bio && <p className="entry-bio">{profile.bio}</p>}
            {profile.tags?.length > 0 && (
              <div className="entry-tags">
                {profile.tags.map((t) => (
                  <span key={t} className="tag-pill">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="gallery-label">Gallery — 収録メディア</div>

        {!isActiveMember && (
          <div
            className="empty-note"
            style={{ borderStyle: "solid", borderColor: "var(--forest)", marginTop: 0 }}
          >
            会員限定の写真・動画は入会後に表示されます。
            <br />
            <Link href="/join" style={{ textDecoration: "underline" }}>
              会員プランを見る
            </Link>
          </div>
        )}

        {!media || media.length === 0 ? (
          <div className="empty-note">まだメディアが登録されていません。</div>
        ) : (
          <div className="media-grid">
            {media.map((m) =>
              m.type === "video" ? (
                <div key={m.id} className="media-item">
                  <video src={m.url} controls playsInline />
                </div>
              ) : (
                <div key={m.id} className="media-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={profile.name} />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
