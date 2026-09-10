import Link from "next/link";

export default function JoinSuccessPage() {
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
          <h1 className="admin-title">ご入会ありがとうございます</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.8 }}>
            決済が完了しました。反映まで数分かかる場合があります。
            マイページで会員ステータスをご確認ください。
          </p>
          <Link
            href="/account"
            className="btn"
            style={{ marginTop: 20, display: "inline-block" }}
          >
            マイページへ
          </Link>
        </div>
      </div>
    </div>
  );
}
