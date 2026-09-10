import Link from "next/link";

export default function TokushohoPage() {
  const rows = [
    ["販売事業者", "（開業届提出後、屋号・氏名を記載）"],
    ["運営責任者", "（氏名を記載）"],
    ["所在地", "（請求があれば遅滞なく開示、の場合はその旨を記載）"],
    ["連絡先", "（メールアドレス等）"],
    ["販売価格", "各プラン詳細ページに記載の金額（税込）"],
    ["商品代金以外の必要料金", "決済手数料等は表示価格に含みます"],
    ["支払方法", "クレジットカード決済（CCBill経由）"],
    ["支払時期", "初回：登録時に即時課金／以降：契約期間ごとに自動課金"],
    ["提供時期", "決済完了後、直ちに会員限定コンテンツを閲覧可能"],
    [
      "返品・キャンセル",
      "デジタルコンテンツの性質上、購入後の返金には応じられません。解約はCCBillメンバーゾーンよりいつでも可能です。",
    ],
  ];

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
      <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 80 }}>
        <h1 className="entry-name" style={{ fontSize: 26, marginBottom: 12 }}>
          特定商取引法に基づく表記
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>
          ※これは雛形です。（　）内は開業届提出後、正式な情報に差し替えてください。
        </p>
        <table className="admin-table">
          <tbody>
            {rows.map(([label, value, note]) => (
              <tr key={label}>
                <th style={{ width: 160 }}>{label}</th>
                <td>
                  {value}
                  {note && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {note}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
