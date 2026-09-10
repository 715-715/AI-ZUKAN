"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AdminListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData?.user?.email ?? "");

    const { data } = await supabase
      .from("profiles")
      .select("id, name, catalog_no, is_published, updated_at")
      .order("sort_order", { ascending: true });
    setProfiles(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function togglePublish(p) {
    await supabase
      .from("profiles")
      .update({ is_published: !p.is_published })
      .eq("id", p.id);
    load();
  }

  async function remove(p) {
    if (!confirm(`「${p.name}」を削除します。よろしいですか？`)) return;
    await supabase.from("media").delete().eq("profile_id", p.id);
    await supabase.from("profiles").delete().eq("id", p.id);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <header className="site-header">
        <div className="site-title">
          AI美女図鑑
          <small>Admin</small>
        </div>
        <nav className="site-nav" style={{ display: "flex", gap: 18 }}>
          <Link href="/">サイトを見る</Link>
          <button className="btn-outline btn" onClick={logout}>
            ログアウト
          </button>
        </nav>
      </header>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            {email && `ログイン中: ${email}`}
          </p>
          <Link href="/admin/new" className="btn">
            + 新規プロフィール登録
          </Link>
        </div>

        <div className="admin-panel">
          {loading ? (
            <p>読み込み中…</p>
          ) : profiles.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>
              まだプロフィールが登録されていません。
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>名前</th>
                  <th>状態</th>
                  <th>更新日</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.catalog_no ?? "—"}</td>
                    <td>{p.name}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          p.is_published ? "published" : ""
                        }`}
                      >
                        {p.is_published ? "公開中" : "下書き"}
                      </span>
                    </td>
                    <td>
                      {p.updated_at
                        ? new Date(p.updated_at).toLocaleDateString("ja-JP")
                        : "—"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          href={`/admin/${p.id}/edit`}
                          className="btn btn-outline"
                        >
                          編集
                        </Link>
                        <button
                          className="btn btn-outline"
                          onClick={() => togglePublish(p)}
                        >
                          {p.is_published ? "非公開にする" : "公開する"}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => remove(p)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
