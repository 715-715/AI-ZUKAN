import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role キーはRLSを無視できる強力な権限を持つため、
// 絶対にブラウザ側のコードや NEXT_PUBLIC_ 環境変数には含めないこと。
// Webhookなど、サーバーだけで完結する処理でのみ使用する。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
