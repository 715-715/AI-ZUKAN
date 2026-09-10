import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, tags, catalog_no, cover_url")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="admin-shell">
      <header className="site-header">
        <div className="site-title">
          AI美女図鑑
          <small>An Illustrated Catalogue</small>
        </div>
        <nav className="site-nav" style={{ display: "flex", gap: 18 }}>
          <Link href="/join">会員登録</Link>
          <Link href="/login">ログイン</Link>
          <Link href="/admin">投稿管理</Link>
        </nav>
      </header>

      <div className="container">
        {!profiles || profiles.length === 0 ? (
          <div className="empty-note">
            まだ収録されている標本（プロフィール）がありません。
            <br />
            管理画面から最初の1件を登録してください。
          </div>
        ) : (
          <div className="specimen-grid">
            {profiles.map((p, i) => (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className="specimen-card"
              >
                <div className="specimen-index">
                  No.{p.catalog_no ?? String(i + 1).padStart(3, "0")}
                </div>
                <div className="specimen-photo">
                  {p.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.name} />
                  )}
                </div>
                <div className="specimen-name">{p.name}</div>
                {p.tags?.length > 0 && (
                  <div className="specimen-tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
