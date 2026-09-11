import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="admin-shell">
      <header className="site-header">
        <Link href="/" className="site-title">
          AI美女図鑑
        </Link>
        <nav className="site-nav">
          <Link href="/">戻る</Link>
        </nav>
      </header>
      <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80, lineHeight: 2 }}>
        <h1 className="entry-name" style={{ fontSize: 26, marginBottom: 24 }}>
          プライバシーポリシー
        </h1>

        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>
          ※これは雛形です。実際に収集する情報・利用目的に合わせて内容を見直してください。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>取得する情報</h2>
        <p>
          会員登録時のメールアドレス、決済処理に伴いCCBillより通知される購読状態
          （有効・解約・期限切れ等）を取得します。クレジットカード情報は当サイトでは
          保持せず、CCBillが直接管理します。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>利用目的</h2>
        <p>会員向けコンテンツの提供、サブスクリプション状態の管理のために利用します。</p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第三者提供</h2>
        <p>
          法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供することは
          ありません。決済処理のためCCBillに必要な情報を共有します。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせ・個人情報の開示請求は、
          <Link href="/tokushoho" style={{ textDecoration: "underline" }}>
            特定商取引法に基づく表記
          </Link>
          に記載の連絡先までご連絡ください。
        </p>
      </div>
    </div>
  );
}
