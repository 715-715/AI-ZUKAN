/* eslint-disable @next/next/no-img-element */
import { fillName } from "@/lib/game/engine";

// 顔写真があれば写真、なければ絵文字
export function Face({ def, cls }) {
  return <div className={cls}>{def.faceUrl ? <img src={def.faceUrl} alt={def.name} /> : def.emoji}</div>;
}

export function FaceMini({ def }) {
  return def.faceUrl ? <img className="face-mini" src={def.faceUrl} alt="" /> : <span>{def.emoji} </span>;
}

// 好感度は数値を隠し、5段階のハートだけ見せる
export function Hearts({ affection }) {
  const level = Math.min(5, Math.floor(affection / 20));
  return (
    <div className="heart-row">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={"heart" + (i < level ? " filled" : "")}>
          ♥
        </span>
      ))}
    </div>
  );
}

export function MediaView({ media, controls = true }) {
  if (!media || !media.url) return null;
  return media.type === "video" ? (
    <video src={media.url} controls={controls} playsInline />
  ) : (
    <img src={media.url} alt="" />
  );
}

/**
 * シナリオの1ページ分の表示（ゲーム本編と管理画面のテスト再生で共用）
 */
export function ScenarioCard({ def, page, playerName, saved, terminal, newEnding, onChoose, onNext, preview }) {
  const name = page.speaker === "char" ? def.name : page.speaker === "player" ? playerName : "";
  const choices = page.choices || [];
  return (
    <div className="overlay">
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {preview && (
          <div className="hint" style={{ marginBottom: 8 }}>
            ▶ テスト再生（好感度・図鑑は変化しません）
          </div>
        )}
        <div className="dialog-head">
          {page.speaker === "char" ? (
            <Face def={def} cls="dialog-avatar" />
          ) : (
            <div className="dialog-avatar">{page.speaker === "player" ? "🙂" : "💭"}</div>
          )}
          <div style={{ flex: 1 }}>
            <div className="dialog-name">{name}</div>
            <div className="dialog-line" style={{ whiteSpace: "pre-wrap" }}>
              {fillName(page.text, playerName)}
            </div>
          </div>
        </div>
        {page.media && page.media.url && (
          <div className="dialog-media">
            <MediaView media={page.media} />
          </div>
        )}
        {saved && (
          <div className="dialog-narration obtain" style={{ marginTop: 10 }}>
            📁 図鑑に保存しました
          </div>
        )}
        {terminal && page.ending && (
          <div className="dialog-narration" style={{ marginTop: 10 }}>
            🏁 ENDING：{page.ending}
            {newEnding ? "（NEW）" : ""}
          </div>
        )}
        {choices.length > 0 ? (
          <div className="dialog-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
            {choices.map((c, i) => (
              <button key={i} className="btn outline" style={{ marginBottom: 8 }} onClick={() => onChoose(i)}>
                {c.label || "（選択肢）"}
              </button>
            ))}
          </div>
        ) : (
          <div className="dialog-actions">
            <button className="btn" onClick={onNext}>
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
