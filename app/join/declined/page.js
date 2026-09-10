import Link from "next/link";

export default function JoinDeclinedPage() {
  return (
    <div className="admin-shell">
      <header className="site-header">
        <Link href="/" className="site-title">
          AI美女図鑑
          <small>An Illustrated Catalogue</small>
        </Link>
      </header>
      <div className="container" style={{ maxWidth: 480, paddingTop: 80, paddingBottom: 80 }}>
        <div className="admin-panel" style={{ textAlign: "center" }}>
          <h1 className="admin-title">決済を完了できませんでした</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.8 }}>
            カード情報の確認、または決済会社側での承認が取れなかった可能性があります。
            お手数ですが、もう一度お試しください。
          </p>
          <Link
            href="/join"
            className="btn"
            style={{ marginTop: 20, display: "inline-block" }}
          >
            もう一度試す
          </Link>
        </div>
      </div>
    </div>
  );
}
