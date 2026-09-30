"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { SKILL_EMOJI, SKILL_LABELS } from "@/lib/game/constants";

function CharCard({ char, onSave, onDelete, uploadMedia }) {
  const [d, setD] = useState(char);
  const [busy, setBusy] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (f, v) => setD((x) => ({ ...x, [f]: v }));
  const setPool = (i, f, v) => setD((x) => ({ ...x, pool: x.pool.map((p, k) => (k === i ? { ...p, [f]: v } : p)) }));

  const onFace = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy("アップロード中…");
    try {
      set("faceUrl", await uploadMedia(file, "game/faces"));
    } catch (err) {
      setMsg("アップロード失敗: " + err.message);
    }
    setBusy("");
  };

  const save = async () => {
    setBusy("保存中…");
    setMsg("");
    const err = await onSave(d);
    setBusy("");
    setMsg(err ? "保存失敗: " + err : "✓ 保存しました");
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className="avatar" style={{ width: 84, flexShrink: 0 }}>
          {d.faceUrl ? <img src={d.faceUrl} alt={d.name} /> : d.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="field">
            <label>顔写真</label>
            <input type="file" accept="image/*" onChange={onFace} />
            {d.faceUrl && (
              <button className="btn small outline" style={{ marginTop: 6 }} onClick={() => set("faceUrl", null)}>
                写真を外す
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row2" style={{ marginTop: 10 }}>
        <div className="field">
          <label>名前</label>
          <input type="text" value={d.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label>絵文字（写真がない時のアイコン）</label>
          <input type="text" value={d.emoji} onChange={(e) => set("emoji", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>ひとこと紹介</label>
        <input type="text" value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
      </div>
      <div className="row2">
        <div className="field">
          <label>得意なスキル（攻略しやすさに影響）</label>
          <select value={d.favSkill} onChange={(e) => set("favSkill", e.target.value)}>
            {Object.keys(SKILL_LABELS).map((k) => (
              <option key={k} value={k}>
                {SKILL_EMOJI[k]} {SKILL_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>並び順（小さいほど先）</label>
          <input type="text" inputMode="numeric" value={d.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </div>
      </div>
      <label style={{ fontSize: 12 }}>
        <input type="checkbox" checked={d.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> ゲームに登場させる
      </label>

      <div style={{ marginTop: 14 }}>
        <b className="hint">日常会話（LINEで話した時のセリフ）</b>
        {d.pool.map((p, i) => (
          <div key={i} className="choice-box">
            <div className="field">
              <label>セリフ（{"{name}"}でプレイヤー名）</label>
              <input type="text" value={p.line} onChange={(e) => setPool(i, "line", e.target.value)} />
            </div>
            <div className="row2">
              <div className="field">
                <label>ひとこと（任意）</label>
                <input type="text" value={p.narration || ""} onChange={(e) => setPool(i, "narration", e.target.value)} />
              </div>
              <div className="field">
                <label style={{ display: "block", marginBottom: 8 }}>好印象</label>
                <input type="checkbox" checked={!!p.win} onChange={(e) => setPool(i, "win", e.target.checked)} />
              </div>
            </div>
            <button className="btn small outline" onClick={() => set("pool", d.pool.filter((_, k) => k !== i))}>
              この行を削除
            </button>
          </div>
        ))}
        <button
          className="btn small outline"
          style={{ marginTop: 8 }}
          onClick={() => set("pool", [...d.pool, { line: "", narration: "", win: false }])}
        >
          ＋ セリフを追加
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" onClick={save} disabled={!!busy}>
          {busy || "保存"}
        </button>
        <button
          className="btn outline"
          onClick={() => {
            if (!confirmDel) return setConfirmDel(true);
            onDelete(d);
          }}
        >
          {confirmDel ? "本当に削除（シナリオも消えます）" : "削除"}
        </button>
        <span className="hint">{msg}</span>
      </div>
    </div>
  );
}

export default function CharacterAdmin({ characters, setCharacters, supabase, uploadMedia }) {
  const toRow = (d) => ({
    id: d.id,
    name: d.name.trim() || "名前未設定",
    emoji: d.emoji || "🙂",
    tagline: d.tagline || "",
    fav_skill: d.favSkill,
    face_url: d.faceUrl || null,
    pool: d.pool.filter((p) => p.line.trim()),
    sort_order: Number(d.sortOrder) || 0,
    is_published: !!d.isPublished,
  });

  const onSave = async (d) => {
    const { error } = await supabase.from("game_characters").upsert(toRow(d));
    if (error) return error.message;
    setCharacters((list) => list.map((c) => (c.id === d.id ? { ...d, isNew: false } : c)));
    return null;
  };

  const onDelete = async (d) => {
    if (!d.isNew) {
      const { error } = await supabase.from("game_characters").delete().eq("id", d.id);
      if (error) return alert("削除に失敗しました: " + error.message);
    }
    setCharacters((list) => list.filter((c) => c.id !== d.id));
  };

  const add = () => {
    const id = "c" + Date.now().toString(36);
    setCharacters((list) => [
      ...list,
      {
        id,
        isNew: true,
        name: "新しいキャラ",
        emoji: "🙂",
        tagline: "",
        favSkill: "intelligence",
        faceUrl: null,
        pool: [{ line: "今日は静かに過ごしていたようだ", narration: "", win: false }],
        sortOrder: list.length + 1,
        isPublished: true,
      },
    ]);
  };

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        ゲームに登場するキャラクターを管理します。新しいキャラを追加すると、既存のプレイヤーの図鑑にも「未入手」として自動で追加されます。
      </p>
      {characters.map((c) => (
        <CharCard key={c.id} char={c} onSave={onSave} onDelete={onDelete} uploadMedia={uploadMedia} />
      ))}
      <button className="btn" onClick={add}>
        ＋ 新規キャラクター
      </button>
    </>
  );
}
