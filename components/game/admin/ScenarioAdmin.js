"use client";

import { useState } from "react";
import { SCENE_LABELS } from "@/lib/game/constants";
import { isTerminal, resolveTarget } from "@/lib/game/engine";
import { ScenarioCard } from "../parts";
import TreeCanvas from "./TreeCanvas";
import NodeModal from "./NodeModal";

const newId = () => "p" + Math.random().toString(36).slice(2, 8);
const newPage = () => ({ id: newId(), speaker: "char", text: "", media: null, after: "end", ending: "", choices: [] });

/* ── エディタ本体：上部にメタ情報、下にツリーキャンバス。ノードをタップするとモーダルが開く ── */
function ScenarioEditor({ draft, setDraft, characters, uploadMedia, onSave, onDelete, onBack }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [openPageId, setOpenPageId] = useState(null);
  const [preview, setPreview] = useState(null);

  const setField = (f, v) => setDraft((d) => ({ ...d, [f]: v }));

  // ページ配列だけを更新するショートカット（NodeModalから呼ばれる）
  const updatePages = (fn) =>
    setDraft((d) => {
      const pages = structuredClone(d.pages);
      fn(pages);
      return { ...d, pages };
    });

  const rootId = draft.pages[0]?.id;

  const save = async () => {
    setBusy("保存中…");
    setMsg("");
    const err = await onSave(draft);
    setBusy("");
    setMsg(err ? "保存失敗: " + err : "✓ 保存しました");
  };

  const char = characters.find((c) => c.id === draft.charId);
  const pvPage = preview ? draft.pages.find((p) => p.id === preview) : null;
  const pvGo = (target) => {
    const cur = draft.pages.find((p) => p.id === preview);
    setPreview(resolveTarget(draft.pages, cur, target));
  };

  return (
    <>
      <div className="hint" style={{ cursor: "pointer", textDecoration: "underline", marginBottom: 10 }} onClick={onBack}>
        ← 一覧に戻る
      </div>
      <div className="card">
        <div className="field">
          <label>タイトル</label>
          <input type="text" value={draft.title} onChange={(e) => setField("title", e.target.value)} />
        </div>
        <div className="row2">
          <div className="field">
            <label>対象キャラ</label>
            <select value={draft.charId} onChange={(e) => setField("charId", e.target.value)}>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>発生する場面</label>
            <select value={draft.scene} onChange={(e) => setField("scene", e.target.value)}>
              {Object.keys(SCENE_LABELS).map((k) => (
                <option key={k} value={k}>
                  {SCENE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>必要な親密度（以上）</label>
            <input type="text" inputMode="numeric" value={String(draft.minAffection)} onChange={(e) => setField("minAffection", e.target.value)} />
          </div>
          {draft.scene === "date" ? (
            <div className="field">
              <label>何軒目のあと（0＝毎回）</label>
              <input type="text" inputMode="numeric" value={String(draft.stop)} onChange={(e) => setField("stop", e.target.value)} />
            </div>
          ) : (
            <div />
          )}
        </div>
        <label style={{ fontSize: 12, marginRight: 14 }}>
          <input type="checkbox" checked={draft.once} onChange={(e) => setField("once", e.target.checked)} /> 一度きりのイベント
        </label>
        <label style={{ fontSize: 12 }}>
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setField("enabled", e.target.checked)} /> ゲームで有効にする
        </label>
      </div>

      <div className="hint" style={{ margin: "4px 0 10px" }}>
        枠（ページ）をタップすると、セリフ・写真動画・分岐を編集できます。ページ内の「＋ 分岐を追加」で、選択肢と新しいページが同時に作られます。オレンジの点線は合流・ループ、オレンジ枠は孤立したページです。
      </div>

      {rootId && <TreeCanvas pages={draft.pages} rootId={rootId} onOpen={setOpenPageId} />}

      {openPageId && (
        <NodeModal
          pages={draft.pages}
          pageId={openPageId}
          isRoot={openPageId === rootId}
          uploadMedia={uploadMedia}
          onNavigate={(id) => id && setOpenPageId(id)}
          onClose={() => setOpenPageId(null)}
          onChange={(fn) => updatePages(fn)}
        />
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0", alignItems: "center" }}>
        <button className="btn" onClick={save} disabled={!!busy}>
          {busy || "保存"}
        </button>
        <button className="btn outline" onClick={() => rootId && setPreview(rootId)}>
          ▶ 最初から通しでテスト再生
        </button>
        {draft.id && (
          <button
            className="btn outline"
            onClick={() => {
              if (!confirmDel) return setConfirmDel(true);
              onDelete(draft);
            }}
          >
            {confirmDel ? "本当に削除" : "削除"}
          </button>
        )}
        <span className="hint">{msg}</span>
      </div>

      {pvPage && char && (
        <ScenarioCard
          def={char}
          page={pvPage}
          playerName="あなた"
          preview
          terminal={isTerminal(draft.pages, pvPage)}
          onChoose={(i) => pvGo(pvPage.choices[i].next || "end")}
          onNext={() => pvGo(pvPage.after || "end")}
        />
      )}
    </>
  );
}

/* ── 一覧＋編集の切り替え ── */
export default function ScenarioAdmin({ scenarios, setScenarios, characters, supabase, uploadMedia }) {
  const [draft, setDraft] = useState(null);

  const normalize = (d) => ({
    title: d.title.trim() || "無題のシナリオ",
    char_id: d.charId,
    scene: d.scene,
    stop: Number(d.stop) || 0,
    min_affection: Number(d.minAffection) || 0,
    once: !!d.once,
    enabled: !!d.enabled,
    pages: d.pages.map((p) => ({
      ...p,
      choices: (p.choices || []).map((c) => ({ ...c, delta: Number(c.delta) || 0 })),
    })),
  });

  const onSave = async (d) => {
    const row = normalize(d);
    if (d.id) {
      const { error } = await supabase.from("game_scenarios").update(row).eq("id", d.id);
      if (error) return error.message;
      setScenarios((l) => l.map((s) => (s.id === d.id ? { ...d } : s)));
    } else {
      const { data, error } = await supabase.from("game_scenarios").insert(row).select().single();
      if (error) return error.message;
      const saved = { ...d, id: data.id };
      setScenarios((l) => [...l, saved]);
      setDraft(saved);
    }
    return null;
  };

  const onDelete = async (d) => {
    const { error } = await supabase.from("game_scenarios").delete().eq("id", d.id);
    if (error) return alert("削除に失敗しました: " + error.message);
    setScenarios((l) => l.filter((s) => s.id !== d.id));
    setDraft(null);
  };

  if (draft) {
    return (
      <ScenarioEditor
        draft={draft}
        setDraft={setDraft}
        characters={characters}
        uploadMedia={uploadMedia}
        onSave={onSave}
        onDelete={onDelete}
        onBack={() => setDraft(null)}
      />
    );
  }

  const create = () => {
    if (!characters.length) return alert("先にキャラクターを登録してください");
    setDraft({
      id: null,
      title: "新しいシナリオ",
      charId: characters[0].id,
      scene: "line",
      stop: 0,
      minAffection: 0,
      once: true,
      enabled: true,
      pages: [newPage()],
    });
  };

  return (
    <div className="card">
      <b className="hint">シナリオ一覧</b>
      <div style={{ marginTop: 6 }}>
        {scenarios.length === 0 && <p className="hint">シナリオがありません</p>}
        {scenarios.map((s) => {
          const c = characters.find((x) => x.id === s.charId);
          return (
            <div key={s.id} className="sc-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {s.title}
                  {s.enabled ? "" : <span className="hint">（無効）</span>}
                </div>
                <div className="hint">
                  {c ? `${c.emoji} ${c.name}` : "（キャラ不明）"} ／ {SCENE_LABELS[s.scene]} ／ 親密度{s.minAffection}以上 ／ {s.pages.length}ページ
                </div>
              </div>
              <button className="btn small outline" onClick={() => setDraft(structuredClone(s))}>
                編集
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn" onClick={create}>
          ＋ 新規シナリオ
        </button>
      </div>
    </div>
  );
}
