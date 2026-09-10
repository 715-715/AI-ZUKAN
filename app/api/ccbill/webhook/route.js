import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// CCBillのWebhook設定で、通知形式を「URL Encoded」または「JSON」どちらでも
// 受け取れるようにパースを分岐しています（管理画面側の設定に合わせてください）。
async function parseBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const text = await request.text();
  const params = new URLSearchParams(text);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

// 期間(日数)を安全にDateへ変換
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 30));
  return d.toISOString();
}

export async function POST(request) {
  const url = new URL(request.url);
  const eventType = url.searchParams.get("eventType");

  const body = await parseBody(request);

  // Dynamic PricingのURLに userId をパススルーで渡しているため、
  // CCBillはWebhookのbody（またはURLパラメータ）にそのまま含めて返します。
  const userId = body.userId || url.searchParams.get("userId");
  const subscriptionId = body.subscriptionId;

  if (!userId) {
    // pass-throughが届かないイベント（テスト送信など）はここで終了
    return NextResponse.json({ received: true, note: "no userId" });
  }

  const supabase = createAdminClient();

  const activeEvents = ["NewSaleSuccess", "RenewalSuccess", "Reactivation"];
  const inactiveEvents = [
    "Cancellation",
    "Expiration",
    "ChargeBack",
    "Refund",
    "Void",
  ];

  try {
    if (activeEvents.includes(eventType)) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          ccbill_subscription_id: subscriptionId,
          status: "active",
          current_period_end: addDays(
            body.recurringPeriod || body.initialPeriod || 30
          ),
        },
        { onConflict: "ccbill_subscription_id" }
      );
    } else if (inactiveEvents.includes(eventType)) {
      const status = eventType === "Cancellation" ? "cancelled" : "expired";
      await supabase
        .from("subscriptions")
        .update({ status })
        .eq("ccbill_subscription_id", subscriptionId);
    }
    // その他のイベント（BillingDateChangeなど）は現状無視

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("CCBill webhook error", err);
    // CCBill側に再送してもらうため、失敗時は 500 を返す
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
