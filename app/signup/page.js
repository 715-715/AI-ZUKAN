"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

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
            <h1 className="admin-title">確認メールを送信しました</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              届いたメール内のリンクをクリックして、登録を完了してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
        <div className="admin-panel">
          <h1 className="admin-title">会員登録</h1>
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
              <label htmlFor="password">パスワード（8文字以上）</label>
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
              {loading ? "登録中…" : "登録する"}
            </button>
          </form>
          <p style={{ fontSize: 13, marginTop: 18, color: "var(--ink-soft)" }}>
            すでにアカウントをお持ちの方は <Link href="/login" style={{ textDecoration: "underline" }}>ログイン</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
