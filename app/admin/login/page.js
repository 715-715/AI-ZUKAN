"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <div className="admin-panel">
          <h1 className="admin-title">管理画面ログイン</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
