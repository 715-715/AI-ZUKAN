/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { isTerminal, resolveTarget } from "@/lib/game/engine";
import { MediaView } from "../parts";

const newId = () => "p" + Math.random().toString(36).slice(2, 8);
const newPage = () => ({ id: newId(), speaker: "char", text: "", media: null, after: "end", ending: "", choices: [] });

export default function NodeModal({ pages, pageId, isRoot, onChange, onNavigate, onClose, uploadMedia }) {
  const [busy, setBusy] = useState("");
  const page = pages.find((p) => p.id === pageId);
  if (!page) return null;

  const edit = (fn) => onChange((draftPages) => fn(draftPages.find((p) => p.id === pageId)));

  const onMedia = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy("アップロード中…");
    try {
      const url = await uploadMedia(file, "game/scenarios");
      const type = file.type.startsWith("video") ? "video" : "image";
      edit((p) => (p.media = { url, type }));
    } catch (err) {
      alert("アップロード失敗: " + err.message);
    }
    setBusy("");
  };

  const addBranch = () => {
    // React の setState 更新関数は非同期に評価されるため、新規ページのidは
    // 更新関数の外（呼び出し前）で確定させておく（中で採番して読み戻そうとすると
    // まだ反映されておらずnullになり、遷移に失敗する）
    const np = newPage();
    onChange((draftPages) => {
      draftPages.push(np);
      const p = draftPages.find((x) => x.id === pageId);
      p.choices.push({ label: "", next: np.id, delta: 0 });
    });
    onNavigate(np.id);
  };

  // 選択肢（またはリンク）を削除。行き先ページが他から参照されていなければ、その先のページごと削除する
  const removeLink = (choiceIndex) => {
    onChange((draftPages) => {
      const p = draftPages.find((x) => x.id === pageId);
      const target = choiceIndex == null ? resolveTarget(draftPages, p, p.after || "end") : resolveTarget(draftPages, p, p.choices[choiceIndex].next);
      if (choiceIndex == null) p.after = "end";
      else p.choices.splice(choiceIndex, 1);
      if (!target) return;
      const stillReferenced = draftPages.some((x) => {
        if (x.id === p.id && choiceIndex != null) return false;
        if ((x.choices || []).length) return x.choices.some((c) => resolveTarget(draftPages, x, c.next) === target);
        return resolveTarget(draftPages, x, x.after || "end") === target;
      });
      if (!stillReferenced) {
        const toDelete = new Set([target]);
        // その先が他に繋がらない一本道なら、連鎖的に削除する
        let cur = draftPages.find((x) => x.id === target);
        while (cur) {
          const links = (cur.choices || []).length
            ? cur.choices.map((c) => resolveTarget(draftPages, cur, c.next)).filter(Boolean)
            : [resolveTarget(draftPages, cur, cur.after || "end")].filter(Boolean);
          if (links.length !== 1) break;
          const nxt = links[0];
          const referencedElsewhere = draftPages.some(
            (x) => x.id !== cur.id && ((x.choices || []).some((c) => resolveTarget(draftPages, x, c.next) === nxt) || resolveTarget(draftPages, x, x.after || "end") === nxt)
          );
          if (referencedElsewhere || toDelete.has(nxt)) break;
          toDelete.add(nxt);
          cur = draftPages.find((x) => x.id === nxt);
        }
        for (let i = draftPages.length - 1; i >= 0; i--) if (toDelete.has(draftPages[i].id)) draftPages.splice(i, 1);
      }
    });
  };

  const deleteThisPage = () => {
    if (isRoot) return;
    onChange((draftPages) => {
      const idx = draftPages.findIndex((p) => p.id === pageId);
      if (idx >= 0) draftPages.splice(idx, 1);
      draftPages.forEach((p) => {
        if (p.after === pageId) p.after = "end";
        (p.choices || []).forEach((c) => {
          if (c.next === pageId) c.next = "end";
        });
      });
    });
    onClose();
  };

  const term = isTerminal(pages, page);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-title" style={{ fontSize: 16, marginBottom: 4 }}>
          {isRoot ? "🏁 最初のページ" : "ページを編集"}
        </div>

        <div className="field">
          <label>話者</label>
          <select value={page.speaker} onChange={(e) => edit((p) => (p.speaker = e.target.value))}>
            <option value="char">キャラ</option>
            <option value="player">自分</option>
            <option value="narr">ナレーション</option>
          </select>
        </div>
        <div className="field">
          <label>セリフ（{"{name}"}でプレイヤー名）</label>
          <textarea value={page.text} onChange={(e) => edit((p) => (p.text = e.target.value))} />
        </div>
        <div className="field">
          <label>写真・動画（任意）</label>
          <input type="file" accept="image/*,video/*" onChange={onMedia} disabled={!!busy} />
          {busy && <span className="hint"> {busy}</span>}
          {page.media && page.media.url && (
            <div className="media-preview">
              <MediaView media={page.media} />
              <button className="btn small outline" style={{ marginTop: 6 }} onClick={() => edit((p) => (p.media = null))}>
                メディアを外す
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label>この先の分岐</label>
          {(page.choices || []).map((ch, i) => (
            <div key={i} className="choice-box" style={{ marginTop: 8 }}>
              <div className="row2">
                <div className="field" style={{ marginBottom: 6 }}>
                  <label>選択肢の文言</label>
                  <input type="text" value={ch.label} onChange={(e) => edit((p) => (p.choices[i].label = e.target.value))} />
                </div>
                <div className="field" style={{ marginBottom: 6 }}>
                  <label>好感度の増減</label>
                  <input type="text" inputMode="numeric" value={String(ch.delta ?? 0)} onChange={(e) => edit((p) => (p.choices[i].delta = e.target.value))} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button className="hint" style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate(resolveTarget(pages, page, ch.next))}>
                  → 行き先のページを開く
                </button>
                <button className="btn small outline" onClick={() => removeLink(i)}>
                  この分岐を削除
                </button>
              </div>
            </div>
          ))}
          <button className="btn small" style={{ marginTop: 8 }} onClick={addBranch}>
            ＋ 分岐を追加（新しいページを作る）
          </button>
        </div>

        {(page.choices || []).length === 0 && (
          <>
            {resolveTarget(pages, page, page.after || "end") && (
              <div className="choice-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button className="hint" style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate(resolveTarget(pages, page, page.after || "end"))}>
                    → 次のページを開く
                  </button>
                  <button className="btn small outline" onClick={() => removeLink(null)}>
                    この繋がりを削除
                  </button>
                </div>
              </div>
            )}
            {!resolveTarget(pages, page, page.after || "end") && (
              <button className="btn small" onClick={addBranch}>
                ＋ この先のページを作る
              </button>
            )}
            {term && (
              <div className="field" style={{ marginTop: 10 }}>
                <label>エンディング名（任意・到達時に表示）</label>
                <input type="text" value={page.ending || ""} onChange={(e) => edit((p) => (p.ending = e.target.value))} />
              </div>
            )}
          </>
        )}

        <div className="dialog-actions" style={{ justifyContent: "space-between", marginTop: 16 }}>
          {!isRoot ? (
            <button className="btn outline" onClick={deleteThisPage}>
              このページを削除
            </button>
          ) : (
            <span />
          )}
          <button className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
