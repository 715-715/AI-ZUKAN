import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isActive = subscription?.status === "active";

  return (
    <div className="admin-shell">
      <header className="site-header">
        <Link href="/" className="site-title">
          AI美女図鑑
          <small>An Illustrated Catalogue</small>
        </Link>
        <nav className="site-nav">
          <Link href="/">サイトを見る</Link>
        </nav>
      </header>

      <div className="container" style={{ maxWidth: 520, paddingTop: 48, paddingBottom: 80 }}>
        <div className="admin-panel">
          <h1 className="admin-title">マイページ</h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>{user.email}</p>

          <div style={{ marginTop: 24 }}>
            <span
              className={`status-pill ${isActive ? "published" : ""}`}
            >
              {isActive ? "会員（有効）" : "未入会 / 会員期限切れ"}
            </span>

            {subscription?.current_period_end && (
              <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>
                次回更新日:{" "}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  "ja-JP"
                )}
              </p>
            )}
          </div>

          {!isActive && (
            <Link href="/join" className="btn" style={{ marginTop: 20, display: "inline-block" }}>
              会員プランに入会する
            </Link>
          )}

          {isActive && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 24, lineHeight: 1.8 }}>
              解約・お支払い方法の変更は、CCBillから届いた確認メール内のメンバーゾーンリンク
              （https://members.ccbill.com など）から行ってください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
