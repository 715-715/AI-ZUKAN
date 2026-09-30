"use client";

import { ACTIVITIES, SKILL_EMOJI, SKILL_LABELS, TUNING } from "@/lib/game/constants";
import { isTerminal } from "@/lib/game/engine";
import { Face, FaceMini, ScenarioCard } from "./parts";

const fullBtn = { width: "100%", marginBottom: 8, justifyContent: "flex-start" };

function Overlay({ children }) {
  return (
    <div className="overlay">
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function GameDialog({ G, eng, act }) {
  const e = G.eventPopup;
  if (!e) return null;
  const def = e.charId ? eng.charDef(e.charId) : null;

  /* ── 今日はどうする？ ── */
  if (e.kind === "daymenu") {
    return (
      <Overlay>
        <div className="site-title" style={{ fontSize: 16, marginBottom: 10 }}>
          今日はどうする？
        </div>
        <button className="btn outline" style={fullBtn} onClick={() => act((g) => eng.chooseDayMenu(g, "self"))}>
          ✨ 自分磨き
        </button>
        <button
          className="btn outline"
          style={{ ...fullBtn, marginBottom: 0 }}
          onClick={() => act((g) => eng.chooseDayMenu(g, "contact"))}
        >
          📱 知り合った女の子に連絡する
        </button>
      </Overlay>
    );
  }

  /* ── 誰に連絡する？ ── */
  if (e.kind === "contactList") {
    return (
      <Overlay>
        <div className="site-title" style={{ fontSize: 16, marginBottom: 10 }}>
          誰に連絡する？
        </div>
        {e.ownedIds.length ? (
          e.ownedIds.map((id) => {
            const d = eng.charDef(id);
            return (
              <button key={id} className="btn outline" style={fullBtn} onClick={() => act((g) => eng.selectContact(g, id))}>
                <FaceMini def={d} /> {d.name}
              </button>
            );
          })
        ) : (
          <p className="hint">まだ誰とも知り合っていません。自分磨きで出会いを探しましょう。</p>
        )}
        <div className="dialog-actions" style={{ marginTop: 10 }}>
          <button className="btn outline" onClick={() => act((g) => { g.eventPopup = { kind: "daymenu" }; })}>
            戻る
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── 連絡方法 ── */
  if (e.kind === "contactMethod") {
    return (
      <Overlay>
        <div className="dialog-head">
          <Face def={def} cls="dialog-avatar" />
          <div style={{ flex: 1 }}>
            <div className="dialog-name">{def.name}</div>
            <div className="hint">どうやって連絡しますか？</div>
          </div>
        </div>
        <div className="dialog-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <button className="btn outline" style={{ marginBottom: 8 }} onClick={() => act((g) => eng.chooseLineChat(g, e.charId))}>
            💬 LINEで話すだけ
          </button>
          <button className="btn" onClick={() => act((g) => eng.chooseDateInvite(g, e.charId))}>
            💌 デートに誘う
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── 自分磨きの活動選択 ── */
  if (e.kind === "activity") {
    return (
      <Overlay>
        <div className="site-title" style={{ fontSize: 16, marginBottom: 10 }}>
          今日はどう過ごしますか？
        </div>
        {e.options.map((id) => {
          const a = ACTIVITIES.find((x) => x.id === id);
          return (
            <button key={id} className="btn outline" style={fullBtn} onClick={() => act((g) => eng.chooseActivity(g, id))}>
              {a.emoji} {a.label}
            </button>
          );
        })}
      </Overlay>
    );
  }

  if (e.kind === "activityResult") {
    const gain = e.gain;
    return (
      <Overlay>
        <div className="dialog-line">{e.title}</div>
        <div className="dialog-narration">
          {typeof gain === "string"
            ? gain
            : `${SKILL_EMOJI[gain.skill]} ${SKILL_LABELS[gain.skill]}が上がった（Lv.${gain.level}）`}
        </div>
        <div className="dialog-actions">
          <button className="btn" onClick={() => act((g) => eng.closeDialog(g))}>
            閉じる
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── デート確定後：エナジーで準備するか ── */
  if (e.kind === "boost") {
    const canAfford = G.energy >= TUNING.ENERGY_BOOST_COST;
    return (
      <Overlay>
        <div className="dialog-head">
          <Face def={def} cls="dialog-avatar" />
          <div style={{ flex: 1 }}>
            <div className="dialog-name">{def.name}</div>
            <div className="dialog-line">当日をより良い日にするため、エナジーを使って準備しますか？</div>
            <div className="hint" style={{ marginTop: 8 }}>
              エナジーを使うと、当日の「家に誘う」成功率が上がります（保有：{G.energy}）
            </div>
          </div>
        </div>
        <div className="boost-row">
          <button className="btn" disabled={!canAfford} onClick={() => act((g) => eng.chooseBoost(g, true))}>
            ⚡エナジーを{TUNING.ENERGY_BOOST_COST}使う
          </button>
          <button className="btn outline" onClick={() => act((g) => eng.chooseBoost(g, false))}>
            そのまま待つ
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── デート本番（N軒目のあと） ── */
  if (e.kind === "dateStage") {
    return (
      <Overlay>
        <div className="dialog-head">
          <Face def={def} cls="dialog-avatar" />
          <div style={{ flex: 1 }}>
            <div className="dialog-name">{def.name}</div>
            <div className="dialog-line">{e.line}</div>
          </div>
        </div>
        <div className="dialog-narration">好感度 +{e.gain}</div>
        <div className="dialog-actions" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 14 }}>
          <button className="btn outline" style={{ marginBottom: 8 }} onClick={() => act((g) => eng.chooseDateStageNext(g))}>
            🍸 {e.stop + 1}軒目に誘う
          </button>
          <button className="btn" style={{ marginBottom: 8 }} onClick={() => act((g) => eng.chooseDateStageHome(g))}>
            🏠 家に誘う
          </button>
          <button className="btn outline" onClick={() => act((g) => eng.chooseDateStageEnd(g))}>
            🚶 今日は帰る
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── 週次まとめ ── */
  if (e.kind === "recap") {
    const w = G.weekStats;
    return (
      <Overlay>
        <div className="site-title" style={{ fontSize: 18 }}>
          今週の成果<small>Weekly Report</small>
        </div>
        <div className="dialog-line" style={{ marginTop: 12 }}>
          📮 {w.obtained.length ? w.obtained.join("、") + " と出会った" : "新しい出会いはなかった"}
        </div>
        <div className="dialog-line" style={{ marginTop: 8 }}>
          💗 {w.milestones.length ? w.milestones.join(" / ") : "大きな進展はなかった"}
        </div>
        <div className="dialog-line" style={{ marginTop: 8 }}>
          🗓️ {w.dateSuccess + w.dateFail > 0 ? `デート成功 ${w.dateSuccess}回 ／ 微妙な結果 ${w.dateFail}回` : "今週の予定はなかった"}
        </div>
        <div className="dialog-narration" style={{ marginTop: 12 }}>
          ⚡ 今週獲得したエナジー：{w.energyGained}
        </div>
        <div className="dialog-actions">
          <button className="btn" onClick={() => act((g) => eng.finishWeek(g))}>
            来週へ進む
          </button>
        </div>
      </Overlay>
    );
  }

  /* ── シナリオ ── */
  if (e.kind === "scenario") {
    const s = G.scenarioSession;
    const sc = eng.getScenario(s.scId);
    const page = sc.pages.find((p) => p.id === s.pageId);
    return (
      <ScenarioCard
        def={eng.charDef(s.charId)}
        page={page}
        playerName={G.playerName}
        saved={s.saved}
        terminal={isTerminal(sc.pages, page)}
        newEnding={s.newEnding}
        onChoose={(i) => act((g) => eng.scenarioChoose(g, i))}
        onNext={() => act((g) => eng.scenarioNext(g))}
      />
    );
  }

  /* ── 出会い／通常のセリフ ── */
  const isObtain = e.kind === "obtain";
  return (
    <Overlay>
      <div className="dialog-head">
        {def ? <Face def={def} cls="dialog-avatar" /> : <div className="dialog-avatar">💭</div>}
        <div style={{ flex: 1 }}>
          <div className="dialog-name">{def ? def.name : ""}</div>
          <div className="dialog-line">{e.line}</div>
        </div>
      </div>
      {e.narration ? <div className={"dialog-narration" + (isObtain ? " obtain" : "")}>{e.narration}</div> : null}
      <div className="dialog-actions">
        <button className="btn" onClick={() => act((g) => eng.closeDialog(g))}>
          閉じる
        </button>
      </div>
    </Overlay>
  );
}
