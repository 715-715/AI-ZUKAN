"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { createEngine, galleryKey } from "@/lib/game/engine";
import { SKILL_EMOJI, SKILL_LABELS, TUNING } from "@/lib/game/constants";
import { Face, Hearts } from "./parts";
import GameDialog from "./GameDialog";

export default function Game({ content, initialSave, userId }) {
  const eng = useMemo(() => createEngine(content), [content]);
  const supabase = useMemo(() => createClient(), []);

  const [G, setG] = useState(() => (initialSave ? eng.reconcile(structuredClone(initialSave)) : null));
  const Gref = useRef(G);
  const [tab, setTab] = useState("board");
  const [rosterView, setRosterView] = useState(null);
  const [mediaKey, setMediaKey] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [saveState, setSaveState] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const first = useRef(true);

  // エンジンのアクションは複製した G に対して実行し、結果を state に反映する
  const act = (fn) => {
    const next = structuredClone(Gref.current);
    fn(next);
    Gref.current = next;
    setG(next);
  };

  // 変更のたびにセーブ（連続操作はまとめる）
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!G) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("game_saves")
        .upsert({ user_id: userId, data: G, updated_at: new Date().toISOString() });
      setSaveState(error ? "error" : "saved");
    }, 700);
    return () => clearTimeout(t);
  }, [G, supabase, userId]);

  const start = () => {
    const g = eng.newGame((nameInput.trim() || "あなた").slice(0, 10));
    Gref.current = g;
    setG(g);
  };

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await supabase.from("game_saves").delete().eq("user_id", userId);
    Gref.current = null;
    setG(null);
    setConfirmReset(false);
    setTab("board");
    setRosterView(null);
  };

  const Title = () => (
    <div className="site-title">
      AI恋愛図鑑<small>An Illustrated Romance Catalogue</small>
    </div>
  );

  /* ───── キャラが未登録 ───── */
  if (content.characters.length === 0) {
    return (
      <div className="rg">
        <div className="wrap">
          <Title />
          <div className="card" style={{ marginTop: 16 }}>
            <p className="hint">キャラクターがまだ登録されていません。管理画面（ゲーム管理）から追加してください。</p>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 名前入力 ───── */
  if (!G) {
    return (
      <div className="rg">
        <div className="wrap">
          <Title />
          <div className="card" style={{ marginTop: 16 }}>
            <p className="hint">まずはあなたの呼び名を教えてください。会話の中で呼ばれます。</p>
            <input
              type="text"
              maxLength={10}
              placeholder="例：しゅん"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button className="btn" onClick={start}>
                はじめる
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const week = G.board.position;
  const ownedCount = Object.keys(G.owned).length;

  const tabbar = (
    <div className="tabbar">
      <button className={"btn " + (tab === "board" ? "" : "outline")} onClick={() => setTab("board")}>
        🎲 進める
      </button>
      <button className={"btn " + (tab === "roster" ? "" : "outline")} onClick={() => setTab("roster")}>
        📖 図鑑
      </button>
    </div>
  );

  const mediaItem = mediaKey ? G.gallery.find((g) => g.key === mediaKey) : null;

  /* ───── 図鑑 ───── */
  const rosterList = (
    <div className="roster">
      {content.characters.map((def, i) => {
        const owned = G.owned[def.id];
        const no = "No." + String(i + 1).padStart(3, "0");
        if (!owned) {
          return (
            <div key={def.id} className="roster-card locked">
              <div className="roster-index">{no}</div>
              <div className="avatar silhouette">❔</div>
              <div className="roster-name">？？？</div>
              <div className="roster-status">未入手</div>
            </div>
          );
        }
        const n = G.gallery.filter((g) => g.charId === def.id).length;
        return (
          <div key={def.id} className="roster-card" style={{ cursor: "pointer" }} onClick={() => setRosterView(def.id)}>
            <div className="roster-index">{no}</div>
            <Face def={def} cls="avatar" />
            <div className="roster-name">{def.name}</div>
            <div className="roster-status">{def.tagline}</div>
            <Hearts affection={owned.affection} />
            <div className="roster-status">{n ? `🎞 ${n}件` : "タップで詳細"}</div>
          </div>
        );
      })}
    </div>
  );

  let rosterDetail = null;
  if (rosterView && G.owned[rosterView]) {
    const def = eng.charDef(rosterView);
    const items = G.gallery.filter((g) => g.charId === rosterView);
    let locked = 0;
    content.scenarios.forEach((sc) => {
      if (sc.charId !== rosterView) return;
      sc.pages.forEach((pg) => {
        if (pg.media && pg.media.url && !G.gallery.some((g) => g.key === galleryKey(sc.id, pg.id))) locked++;
      });
    });
    rosterDetail = (
      <>
        <div className="hint" style={{ cursor: "pointer", textDecoration: "underline", marginBottom: 10 }} onClick={() => setRosterView(null)}>
          ← 図鑑に戻る
        </div>
        <div className="card">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Face def={def} cls="dialog-avatar" />
            <div>
              <div className="roster-name">{def.name}</div>
              <div className="roster-status">{def.tagline}</div>
              <div style={{ marginTop: 4 }}>
                <Hearts affection={G.owned[rosterView].affection} />
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <b className="hint">
            収録メディア（{items.length} / {items.length + locked}）
          </b>
          {items.length + locked > 0 ? (
            <div className="gallery-grid" style={{ marginTop: 10 }}>
              {items.map((g) => (
                <div key={g.key} className="gallery-tile" onClick={() => setMediaKey(g.key)}>
                  {g.media.type === "video" ? (
                    <>
                      <video src={g.media.url + "#t=0.1"} muted preload="metadata" />
                      <span className="play">▶</span>
                    </>
                  ) : (
                    <img src={g.media.url} alt="" />
                  )}
                </div>
              ))}
              {Array.from({ length: locked }).map((_, i) => (
                <div key={"l" + i} className="gallery-tile locked">
                  🔒
                </div>
              ))}
            </div>
          ) : (
            <p className="hint" style={{ marginTop: 8 }}>
              まだメディアがありません。シナリオを進めると保存されます。
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="rg">
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Title />
          <Link href="/" className="hint" style={{ textDecoration: "underline" }}>
            トップへ
          </Link>
        </div>

        {tab === "roster" ? (
          <>
            <div className="sub">
              入手済み {ownedCount} / {content.characters.length}
            </div>
            {tabbar}
            {rosterDetail || (
              <>
                {rosterList}
                <p className="hint">※好感度の数値は表示されず、ハートの本数で大まかな親密度だけが分かります</p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="sub">
              {G.playerName}さんの今週（{Math.max(week + 1, 1)} / 7日目）
            </div>
            {tabbar}
            <div className="card">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", fontSize: 11, color: "var(--ink-soft)" }}>
                {Object.keys(SKILL_LABELS).map((k) => (
                  <span key={k}>
                    {SKILL_EMOJI[k]} {SKILL_LABELS[k]} Lv.{G.skills[k]}
                  </span>
                ))}
              </div>
            </div>
            <div className="card board-wrap">
              <div className="squares">
                {G.board.squares.map((sq, i) => {
                  const here = i === week;
                  let cls = "sq";
                  if (sq.type === "reserved") cls += " reserved";
                  else if (sq.type === "recap") cls += " goal";
                  if (here) cls += " here";
                  const icon = here ? "🚩" : sq.type === "reserved" ? "💗" : sq.type === "recap" ? "🏁" : "❓";
                  return (
                    <div key={i} className={cls}>
                      {icon}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div className="energy-badge">⚡ エナジー：{G.energy}</div>
              <button
                className="btn small outline"
                disabled={G.energy < TUNING.GACHA_COST || G.unmet.length === 0 || !!G.eventPopup}
                onClick={() => act((g) => eng.pullGacha(g))}
              >
                ガチャを引く（{TUNING.GACHA_COST}）
              </button>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <button className="btn" disabled={!!G.eventPopup} onClick={() => act((g) => eng.advanceDay(g))}>
                ▶ 次の日へ進む
              </button>
            </div>
            <div className="card">
              <b className="hint">ログ</b>
              <div style={{ marginTop: 8 }}>
                {G.log.length ? (
                  G.log.map((l, i) => (
                    <div key={i} className="log-line">
                      {l}
                    </div>
                  ))
                ) : (
                  <div className="log-line">まだ何も起きていません</div>
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="hint">
            {saveState === "saving" && "セーブ中…"}
            {saveState === "saved" && "✓ セーブ済み"}
            {saveState === "error" && "⚠ セーブに失敗しました"}
          </span>
          <button className="btn small outline" onClick={reset}>
            {confirmReset ? "本当に最初からやり直す" : "最初からやり直す"}
          </button>
        </div>

        <GameDialog G={G} eng={eng} act={act} />

        {mediaItem && (
          <div className="overlay" onClick={() => setMediaKey(null)}>
            <div className="dialog" onClick={(e) => e.stopPropagation()}>
              <div className="hint" style={{ marginBottom: 8 }}>
                {mediaItem.scTitle}
              </div>
              {mediaItem.media.type === "video" ? (
                <video src={mediaItem.media.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "60vh", display: "block", margin: "0 auto" }} />
              ) : (
                <img src={mediaItem.media.url} alt="" style={{ maxWidth: "100%", maxHeight: "60vh", display: "block", margin: "0 auto" }} />
              )}
              <div className="dialog-actions">
                <button className="btn" onClick={() => setMediaKey(null)}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
