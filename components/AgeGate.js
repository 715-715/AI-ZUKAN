"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "age-verified-v1";

export default function AgeGate({ children }) {
  const [verified, setVerified] = useState(null); // null = 判定中

  useEffect(() => {
    setVerified(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function confirm() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVerified(true);
  }

  function decline() {
    window.location.href = "https://www.google.com";
  }

  if (verified === null) {
    // 初回描画時のちらつき防止（localStorage判定はクライアントのみ）
    return null;
  }

  if (verified) {
    return children;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--ink)",
        color: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        zIndex: 9999,
      }}
    >
      <p
        style={{
          fontFamily: "var(--serif-en)",
          fontStyle: "italic",
          fontSize: 14,
          letterSpacing: "0.08em",
          color: "#c9bc9e",
          marginBottom: 10,
        }}
      >
        Age Verification
      </p>
      <h1
        style={{
          fontFamily: "var(--serif-jp)",
          fontWeight: 700,
          fontSize: 24,
          maxWidth: 420,
          lineHeight: 1.6,
          marginBottom: 8,
        }}
      >
        このサイトは18歳以上の方のみ閲覧できます
      </h1>
      <p style={{ fontSize: 13, color: "#c9bc9e", maxWidth: 420, marginBottom: 32 }}>
        本サイトは成人向けコンテンツを含みます。あなたは18歳以上ですか？
      </p>
      <div style={{ display: "flex", gap: 14 }}>
        <button
          onClick={confirm}
          style={{
            background: "var(--forest)",
            color: "var(--paper)",
            border: "none",
            padding: "12px 28px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          はい、18歳以上です
        </button>
        <button
          onClick={decline}
          style={{
            background: "transparent",
            color: "var(--paper)",
            border: "1px solid #5b5344",
            padding: "12px 28px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          いいえ、退出する
        </button>
      </div>
    </div>
  );
}
