import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { buildCcbillCheckoutUrl } from "@/lib/ccbill";

export default async function JoinPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/join");
  }

  let checkoutUrl = null;
  let configError = null;
  try {
    checkoutUrl = buildCcbillCheckoutUrl({
      userId: user.id,
      userEmail: user.email,
    });
  } catch (err) {
    configError = err.message;
  }

  return (
    <div className="admin-shell">
      <header className="site-header">
        <Link href="/" className="site-title">
          AI美女図鑑
          <small>An Illustrated Catalogue</small>
        </Link>
        <nav className="site-nav">
          <Link href="/account">マイページ</Link>
        </nav>
      </header>

      <div className="container" style={{ maxWidth: 640, paddingTop: 48, paddingBottom: 80 }}>
        <div className="admin-panel">
          <h1 className="admin-title">会員プランに入会する</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.8 }}>
            会員限定の写真・動画コンテンツをすべて閲覧できるようになります。
            決済情報は当サイトには保存されず、国際的な決済代行会社CCBillが
            安全に処理します。
          </p>

          {configError ? (
            <p className="error-text" style={{ marginTop: 16 }}>
              決済の設定が完了していません（{configError}）。管理者に連絡してください。
            </p>
          ) : (
            <div
              style={{
                marginTop: 20,
                border: "1px solid var(--line)",
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  letterSpacing: "0.04em",
                }}
              >
                <span>🔒 Secure Checkout — Powered by CCBill</span>
              </div>
              <iframe
                src={checkoutUrl}
                title="お支払い手続き"
                style={{
                  width: "100%",
                  height: 720,
                  border: "none",
                  display: "block",
                }}
              />
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 24 }}>
            入会手続きを行うことで、
            <Link href="/terms" style={{ textDecoration: "underline" }}>利用規約</Link>
            {" "}および{" "}
            <Link href="/tokushoho" style={{ textDecoration: "underline" }}>特定商取引法に基づく表記</Link>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
}
