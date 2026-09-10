"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="admin-shell">
        <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
          <div className="admin-panel">
            <h1 className="admin-title">パスワードを更新しました</h1>
            <button className="btn" onClick={() => router.push("/admin/login")}>
              ログイン画面へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <div className="admin-panel">
          <h1 className="admin-title">新しいパスワードを設定</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="password">新しいパスワード（8文字以上）</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "更新中…" : "更新する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}