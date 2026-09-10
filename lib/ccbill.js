import crypto from "crypto";

/**
 * CCBill FlexForms の Dynamic Pricing 用チェックアウトURLを生成します。
 *
 * ⚠️ 重要: formDigest（MD5ハッシュ）の生成式は、CCBillの管理画面で
 * 「Dynamic Pricing User Guide」に記載されている、あなたのサブアカウントの
 * 価格設定タイプ（単発 / 継続課金 / トライアルつき等）によって
 * 連結するパラメータの順序が変わります。
 * 以下は「継続課金（トライアルなし）」の一般的な式ですが、
 * 本番で使う前に必ずCCBill管理画面のガイドと照合し、
 * CCBillのテスト（サンドボックス）カード番号で1回決済テストしてください。
 */
/**
 * CCBill FlexForms の Dynamic Pricing 用チェックアウトURLを生成します。
 *
 * ⚠️ 重要: formDigest（MD5ハッシュ）の生成式は、CCBillの管理画面で
 * 「Dynamic Pricing User Guide」に記載されている、あなたのサブアカウントの
 * 価格設定タイプ（単発 / 継続課金 / トライアルつき等）によって
 * 連結するパラメータの順序が変わります。
 * 以下は「継続課金（トライアルなし）」の一般的な式ですが、
 * 本番で使う前に必ずCCBill管理画面のガイドと照合し、
 * CCBillのテスト（サンドボックス）カード番号で1回決済テストしてください。
 */
export function buildCcbillCheckoutUrl({ userId, userEmail, embedded = false }) {
  const clientAccnum = process.env.CCBILL_CLIENT_ACCNUM;
  const clientSubacc = process.env.CCBILL_CLIENT_SUBACC;
  const flexformId = process.env.CCBILL_FLEXFORM_ID;
  const salt = process.env.CCBILL_SALT;

  const initialPrice = process.env.CCBILL_INITIAL_PRICE || "10.00";
  const initialPeriod = process.env.CCBILL_INITIAL_PERIOD || "30";
  const recurringPrice = process.env.CCBILL_RECURRING_PRICE || "10.00";
  const recurringPeriod = process.env.CCBILL_RECURRING_PERIOD || "30";
  const numRebills = process.env.CCBILL_NUM_REBILLS || "99";
  const currencyCode = process.env.CCBILL_CURRENCY_CODE || "392"; // 392 = JPY

  // 決済完了・失敗後にユーザーを自サイトへ戻すためのURL。
  // CCBill管理画面のサブアカウント設定（Approval/Decline Redirect）でも
  // 同じURLを登録しておく必要がある場合があります（要・管理画面で確認）。
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const approvalUrl = `${siteUrl}/join/success`;
  const declineUrl = `${siteUrl}/join/declined`;

  if (!clientAccnum || !clientSubacc || !flexformId || !salt) {
    throw new Error(
      "CCBillの環境変数が未設定です（CCBILL_CLIENT_ACCNUM / CCBILL_CLIENT_SUBACC / CCBILL_FLEXFORM_ID / CCBILL_SALT）。"
    );
  }

  // 一般的な「継続課金」の連結順序（要・本番前の照合）
  const digestSource =
    initialPrice +
    initialPeriod +
    recurringPrice +
    recurringPeriod +
    numRebills +
    currencyCode +
    salt;

  const formDigest = crypto
    .createHash("md5")
    .update(digestSource)
    .digest("hex");

  const params = new URLSearchParams({
    clientSubacc,
    initialPrice,
    initialPeriod,
    recurringPrice,
    recurringPeriod,
    numRebills,
    currencyCode,
    formDigest,
    approvalUrl,
    declineUrl,
    // approvalUrl/declineUrlへの遷移時、iframeの中ではなく
    // ブラウザ全体で遷移させるための指定（CCBill側が対応している場合）
    approvalRedirectMethod: "GET",
    declineRedirectMethod: "GET",
    // Pass-through: Webhookで自社ユーザーと突き合わせるための独自パラメータ
    // (CCBill側はこれを保持したままWebhookで返してくれる)
    "userId": userId,
  });

  if (userEmail) {
    params.set("email", userEmail);
  }

  return `https://api.ccbill.com/wap-frontflex/flexforms/${flexformId}?${params.toString()}`;
}
