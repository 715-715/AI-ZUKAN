import Link from "next/link";

export default function TermsPage() {
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
          利用規約
        </h1>

        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>
          ※これは雛形です。公開前に必ず内容を事業内容に合わせて見直し、
          可能であれば法律の専門家の確認を受けてください。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第1条（本サイトについて）</h2>
        <p>
          本サイト「AI美女図鑑」（以下「当サイト」）で掲載されるプロフィール・写真・動画は、
          すべてAI（人工知能）によって生成された架空の人物です。実在する人物を撮影・収録した
          ものではなく、実在の人物をモデルとして特定・示唆するものでもありません。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第2条（年齢制限）</h2>
        <p>
          当サイトは18歳未満の方の閲覧を固く禁じます。会員登録・コンテンツ閲覧をもって、
          利用者は自身が18歳以上であることを表明したものとみなします。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第3条（会員登録・退会）</h2>
        <p>
          会員登録および決済はCCBillを通じて行われます。退会・解約方法については
          CCBillより送付される確認メールに記載のメンバーゾーンをご利用ください。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第4条（禁止事項）</h2>
        <p>
          コンテンツの無断複製・再配布・第三者への提供、未成年者への提供・閲覧させる行為を
          禁止します。
        </p>

        <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 8 }}>第5条（免責事項）</h2>
        <p>
          当サイトの利用により生じたいかなる損害についても、運営者は責任を負わないものとします。
        </p>
      </div>
    </div>
  );
}
