/**
 * ゲームエンジン（画面に依存しない純粋なロジック）
 *
 * - キャラクターとシナリオは DB から渡される `content` で決まる
 *     content.characters: [{ id, name, emoji, tagline, favSkill, faceUrl, pool:[{line, narration, win}] }]
 *     content.scenarios : [{ id, title, charId, scene, stop, minAffection, once, enabled, pages:[...] }]
 * - 進行データ G（セーブデータ）は JSON にできるプレーンなオブジェクト。
 * - `createEngine(content)` が返す各アクションは G を直接書き換える。
 *   React 側では複製した G に対して呼び出し、結果を state に入れる。
 */
import {
  ACTIVITIES,
  BOARD_LENGTH,
  TUNING,
} from "./constants";

const rnd = (n) => Math.floor(Math.random() * n);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const fillName = (tpl, name) => String(tpl || "").split("{name}").join(name);
export const galleryKey = (scId, pageId) => `${scId}:${pageId}`;

/* ── シナリオのページ遷移ヘルパー（管理画面でも使う） ── */
export function resolveTarget(pages, pg, t) {
  if (!t || t === "end") return null;
  if (t === "seq") {
    const i = pages.indexOf(pg);
    return pages[i + 1] ? pages[i + 1].id : null;
  }
  return pages.some((p) => p.id === t) ? t : null;
}
export function isTerminal(pages, pg) {
  return (pg.choices || []).length === 0 && resolveTarget(pages, pg, pg.after || "end") === null;
}

function newWeekStats() {
  return { obtained: [], milestones: [], dateSuccess: 0, dateFail: 0, energyGained: 0 };
}

function generateBoard(length) {
  const squares = [];
  for (let i = 0; i < length - 1; i++) squares.push({ type: "event", charId: null });
  squares.push({ type: "recap", charId: null }); // 最終マス＝週次まとめ
  // -1 ＝「まだ1日も進んでいない」。次の advanceDay() で index0 に着地する
  return { squares, position: -1 };
}

export function createEngine(content) {
  const charById = new Map(content.characters.map((c) => [c.id, c]));
  const scById = new Map(content.scenarios.map((s) => [s.id, s]));
  const charDef = (id) => charById.get(id);
  const getScenario = (id) => scById.get(id);

  /* ───────── 初期化・整合性 ───────── */
  function newGame(playerName) {
    return {
      v: 1,
      playerName,
      energy: 0,
      skills: { intelligence: 0, sensibility: 0, passion: 0, muscle: 0, looks: 0, curiosity: 0 },
      board: generateBoard(BOARD_LENGTH),
      owned: {},
      unmet: content.characters.map((c) => c.id),
      pendingNextWeek: [],
      weekStats: newWeekStats(),
      eventPopup: null,
      dateSession: null,
      scenarioSession: null,
      gallery: [],
      endings: [],
      played: [],
      log: [],
    };
  }

  // セーブ読込時：コンテンツの追加・削除に追従させる
  function reconcile(G) {
    const base = newGame(G.playerName || "あなた");
    for (const k of Object.keys(base)) if (G[k] === undefined) G[k] = base[k];
    G.skills = { ...base.skills, ...G.skills };
    for (const id of Object.keys(G.owned)) if (!charDef(id)) delete G.owned[id];
    G.unmet = content.characters.map((c) => c.id).filter((id) => !G.owned[id]);
    G.gallery = G.gallery.filter((g) => charDef(g.charId));
    // 消えたキャラ・シナリオを参照している途中状態は破棄
    const p = G.eventPopup;
    if (p && p.charId && !charDef(p.charId)) G.eventPopup = null;
    if (G.scenarioSession && (!getScenario(G.scenarioSession.scId) || !charDef(G.scenarioSession.charId))) {
      G.scenarioSession = null;
      if (G.eventPopup && G.eventPopup.kind === "scenario") G.eventPopup = null;
    }
    if (G.dateSession && !charDef(G.dateSession.charId)) G.dateSession = null;
    G.board.squares.forEach((sq, i) => {
      if (sq.type === "reserved" && !charDef(sq.charId)) G.board.squares[i] = { type: "event", charId: null };
    });
    G.pendingNextWeek = G.pendingNextWeek.filter((x) => charDef(x.charId));
    return G;
  }

  const addLog = (G, text) => {
    G.log.unshift(text);
    if (G.log.length > 24) G.log.pop();
  };

  const skillBonus = (G, charId) => Math.min(G.skills[charDef(charId).favSkill] || 0, 10);

  /* ───────── ダイアログ ───────── */
  function showCharDialog(G, charId, line, narration) {
    G.eventPopup = { kind: "normal", charId, line, narration: narration || "" };
    addLog(G, charDef(charId).name + "：" + line + (narration ? "／" + narration : ""));
  }
  function showGenericDialog(G, line, narration) {
    G.eventPopup = { kind: "normal", charId: null, line, narration: narration || "" };
    addLog(G, line);
  }
  function closeDialog(G) {
    G.eventPopup = null;
  }

  /* ───────── 入手 ───────── */
  function obtainCharacter(G, id) {
    const def = charDef(id);
    G.owned[id] = {
      id,
      affection: TUNING.START_AFFECTION,
      metMilestones: [],
      isSpecialRelation: false,
      hasPendingDate: false,
    };
    G.unmet = G.unmet.filter((x) => x !== id);
    G.eventPopup = {
      kind: "obtain",
      charId: id,
      line: fillName("初めまして、{name}さん。よろしくお願いします。", G.playerName),
      narration: def.name + " を図鑑に登録した！",
    };
    addLog(G, "💮 新しい出会い：" + def.name);
    G.weekStats.obtained.push(def.name);
  }

  function pullGacha(G) {
    if (G.eventPopup || G.energy < TUNING.GACHA_COST || G.unmet.length === 0) return;
    G.energy -= TUNING.GACHA_COST;
    obtainCharacter(G, G.unmet[rnd(G.unmet.length)]);
  }

  /* ───────── 1日を進める ───────── */
  function advanceDay(G) {
    if (G.eventPopup) return;
    const b = G.board;
    let pos = b.position + 1;
    if (pos >= b.squares.length) pos = 0;
    b.position = pos;
    G.energy += 1;
    G.weekStats.energyGained += 1;
    const sq = b.squares[pos];
    if (sq.type === "recap") {
      G.eventPopup = { kind: "recap" };
    } else if (sq.type === "reserved") {
      startDateChain(G, sq.charId, sq.boosted);
    } else {
      G.eventPopup = { kind: "daymenu" };
    }
  }

  function finishWeek(G) {
    G.board.position = -1;
    G.weekStats = newWeekStats();
    // 今週に収まらなかった予約を、来週の盤面へ反映
    G.pendingNextWeek.forEach((p) => {
      G.board.squares[p.index] = { type: "reserved", charId: p.charId, kind: p.kind, boosted: p.boosted };
    });
    G.pendingNextWeek = [];
    G.eventPopup = null;
  }

  /* ───────── 今日はどうする？ ───────── */
  function chooseDayMenu(G, choice) {
    if (choice === "self") trySelfImprovement(G);
    else if (choice === "contact") G.eventPopup = { kind: "contactList", ownedIds: Object.keys(G.owned) };
  }

  function trySelfImprovement(G) {
    const rate = TUNING.ENCOUNTER_RATE + Math.min(G.skills.curiosity, 10) * 0.02;
    if (G.unmet.length > 0 && Math.random() < rate) {
      obtainCharacter(G, G.unmet[rnd(G.unmet.length)]);
      return;
    }
    const pool = ACTIVITIES.slice();
    const options = [];
    while (options.length < 3 && pool.length) options.push(pool.splice(rnd(pool.length), 1)[0].id);
    G.eventPopup = { kind: "activity", options };
  }

  function chooseActivity(G, activityId) {
    const act = ACTIVITIES.find((a) => a.id === activityId);
    if (!act) return;
    let narration;
    if (act.energy) {
      G.energy += act.energy;
      G.weekStats.energyGained += act.energy;
      narration = `⚡ エナジーを${act.energy}獲得した`;
    } else {
      G.skills[act.skill] += 1;
      narration = { skill: act.skill, level: G.skills[act.skill] };
    }
    G.eventPopup = { kind: "activityResult", title: `${act.emoji} ${act.label}`, gain: narration };
    addLog(G, `${act.emoji} ${act.label}`);
  }

  /* ───────── 女の子に連絡する ───────── */
  function selectContact(G, charId) {
    G.eventPopup = { kind: "contactMethod", charId };
  }

  function chooseLineChat(G, charId) {
    const st = G.owned[charId];
    const milestone = checkMilestones(G, charId);
    if (milestone) {
      showCharDialog(G, charId, milestone.line, milestone.narration);
      return;
    }
    const sc = findScenario(G, charId, "line");
    if (sc) {
      startScenario(G, sc, null);
      return;
    }
    const pool = charDef(charId).pool || [];
    const item = pool.length ? pool[rnd(pool.length)] : { line: "他愛のない話をした。", narration: "", win: false };
    const bonus = item.win ? 2 + skillBonus(G, charId) : 0;
    st.affection = clamp(st.affection + TUNING.LINE_BASE_GAIN + bonus, 0, 100);
    showCharDialog(G, charId, fillName(item.line, G.playerName), item.narration);
  }

  function checkMilestones(G, charId) {
    const st = G.owned[charId];
    const def = charDef(charId);
    if (st.affection >= 80 && !st.isSpecialRelation && !st.metMilestones.includes("confess")) {
      st.metMilestones.push("confess");
      st.isSpecialRelation = true;
      G.weekStats.milestones.push(def.name + "と関係が進展した");
      return {
        line: fillName("「ずっと考えてました…{name}さん、これからよろしくお願いします」", G.playerName),
        narration: "💗 関係が進展した",
      };
    }
    if (st.affection >= 50 && !st.metMilestones.includes("close")) {
      st.metMilestones.push("close");
      G.weekStats.milestones.push(def.name + "と距離が縮まった");
      return {
        line: fillName("「{name}さんと話してると、なんだか落ち着きます」", G.playerName),
        narration: "距離が縮まった",
      };
    }
    return null;
  }

  /* ───────── デートの予約 ───────── */
  function scheduleReservedEvent(G, charId, daysAhead, kind) {
    const b = G.board;
    const lastEventIndex = b.squares.length - 2;
    const rawTarget = b.position + daysAhead;
    if (rawTarget <= lastEventIndex) {
      b.squares[rawTarget] = { type: "reserved", charId, kind: kind || "date", boosted: false };
      return { week: "current", index: rawTarget };
    }
    const overflowIndex = clamp(rawTarget - b.squares.length, 0, lastEventIndex);
    G.pendingNextWeek.push({ charId, index: overflowIndex, kind: kind || "date", boosted: false });
    return { week: "next", index: overflowIndex };
  }

  function chooseDateInvite(G, charId) {
    const st = G.owned[charId];
    const def = charDef(charId);
    if (st.hasPendingDate) {
      showCharDialog(G, charId, "「その日の予定、もう聞いてますよ」", "");
      return;
    }
    if (st.affection < TUNING.DATE_AFFECTION_THRESHOLD) {
      showCharDialog(G, charId, "「まだそんなに仲良くないので…また誘ってくださいね」", "デートを断られた");
      return;
    }
    st.hasPendingDate = true;
    const scheduled = scheduleReservedEvent(G, charId, 2, "date");
    addLog(G, def.name + "：" + (scheduled.week === "next" ? "来週の予定が確定した" : "2日後の予定が確定した"));
    G.eventPopup = { kind: "boost", charId, week: scheduled.week, squareIndex: scheduled.index };
  }

  function chooseBoost(G, useEnergy) {
    const e = G.eventPopup;
    const charId = e.charId;
    if (useEnergy && G.energy >= TUNING.ENERGY_BOOST_COST) {
      G.energy -= TUNING.ENERGY_BOOST_COST;
      if (e.week === "current") {
        G.board.squares[e.squareIndex].boosted = true;
      } else {
        const pending = G.pendingNextWeek.find((p) => p.charId === charId && p.index === e.squareIndex);
        if (pending) pending.boosted = true;
      }
      showCharDialog(G, charId, "「本当ですか、嬉しいです」", "気合を入れて準備した（当日の成功率アップ）");
    } else {
      showCharDialog(G, charId, "「楽しみにしていますね」", "");
    }
  }

  /* ───────── デート本番（夜のご飯→2軒目…／家に誘う／帰る） ───────── */
  function startDateChain(G, charId, boosted) {
    G.dateSession = { charId, stop: 1, boosted: !!boosted };
    advanceDateStop(G);
  }

  function dateStopFlavor(G, stop, def) {
    if (stop === 1) return fillName(`夜、${def.name}を誘って食事に出かけた。{name}さんとの時間を楽しんでいる。`, G.playerName);
    if (stop === 2) return "食事を終え、そのまま2軒目、静かなバーへ流れた。";
    return `夜はまだ長い。さらに${stop}軒目へ足を伸ばした。`;
  }

  function advanceDateStop(G) {
    const s = G.dateSession;
    const st = G.owned[s.charId];
    const def = charDef(s.charId);
    const gain = TUNING.DATE_STOP_GAIN + Math.floor(skillBonus(G, s.charId) / 2);
    st.affection = clamp(st.affection + gain, 0, 100);
    const stagePopup = { kind: "dateStage", charId: s.charId, stop: s.stop, line: dateStopFlavor(G, s.stop, def), gain };
    const sc = findScenario(G, s.charId, "date", s.stop);
    if (sc) {
      startScenario(G, sc, stagePopup);
      return;
    }
    G.eventPopup = stagePopup;
  }

  function chooseDateStageNext(G) {
    G.dateSession.stop += 1;
    advanceDateStop(G);
  }

  function chooseDateStageHome(G) {
    const s = G.dateSession;
    const st = G.owned[s.charId];
    st.hasPendingDate = false;
    const base = s.boosted ? TUNING.BOOSTED_SUCCESS_RATE : TUNING.BASE_SUCCESS_RATE;
    const rate = clamp(base + skillBonus(G, s.charId) * 0.03, 0, 0.97);
    if (Math.random() < rate) {
      st.affection = clamp(st.affection + 10, 0, 100);
      G.weekStats.dateSuccess += 1;
      const hsc = findScenario(G, s.charId, "home");
      if (hsc) startScenario(G, hsc, null);
      else showCharDialog(G, s.charId, "「今日は…帰りたくないです」", "💗 家に招いてもらえた");
    } else {
      st.affection = clamp(st.affection + 3, 0, 100);
      G.weekStats.dateFail += 1;
      showCharDialog(G, s.charId, "「今日はここまでにしておきましょう…また誘ってくださいね」", "");
    }
    G.dateSession = null;
  }

  function chooseDateStageEnd(G) {
    const s = G.dateSession;
    G.owned[s.charId].hasPendingDate = false;
    G.weekStats.dateSuccess += 1;
    showCharDialog(G, s.charId, "「今日は本当に楽しかったです、また誘ってくださいね」", "良い時間を過ごせた");
    G.dateSession = null;
  }

  /* ───────── シナリオ再生 ───────── */
  function findScenario(G, charId, scene, stop) {
    const st = G.owned[charId];
    return content.scenarios.find(
      (s) =>
        s.enabled &&
        s.pages.length > 0 &&
        s.charId === charId &&
        s.scene === scene &&
        (scene !== "date" || !s.stop || s.stop === stop) &&
        st.affection >= s.minAffection &&
        !(s.once && G.played.includes(s.id))
    );
  }

  function startScenario(G, sc, returnPopup) {
    if (!G.played.includes(sc.id)) G.played.push(sc.id);
    addLog(G, "📖 " + sc.title);
    G.scenarioSession = { scId: sc.id, pageId: sc.pages[0].id, charId: sc.charId, returnPopup: returnPopup || null, saved: false, newEnding: false };
    enterPage(G);
    G.eventPopup = { kind: "scenario" };
  }

  // ページに入った時：メディアを図鑑に保存／エンディング到達を記録
  function enterPage(G) {
    const s = G.scenarioSession;
    const sc = getScenario(s.scId);
    const page = sc.pages.find((p) => p.id === s.pageId);
    s.saved = false;
    s.newEnding = false;
    if (page.media && page.media.url) {
      const key = galleryKey(sc.id, page.id);
      if (!G.gallery.some((g) => g.key === key)) {
        G.gallery.push({ key, charId: sc.charId, scTitle: sc.title, media: { url: page.media.url, type: page.media.type } });
        addLog(G, "📁 図鑑に保存：" + sc.title);
        s.saved = true;
      }
    }
    if (isTerminal(sc.pages, page)) {
      const k = galleryKey(sc.id, page.id);
      if (!G.endings.includes(k)) {
        G.endings.push(k);
        s.newEnding = true;
        if (page.ending) addLog(G, "🏁 ENDING：" + page.ending);
      }
    }
  }

  function scenarioGoto(G, target) {
    const s = G.scenarioSession;
    const sc = getScenario(s.scId);
    const cur = sc.pages.find((p) => p.id === s.pageId);
    const nextId = resolveTarget(sc.pages, cur, target);
    if (nextId) {
      s.pageId = nextId;
      enterPage(G);
    } else {
      G.eventPopup = s.returnPopup || null;
      G.scenarioSession = null;
    }
  }

  function scenarioNext(G) {
    const sc = getScenario(G.scenarioSession.scId);
    const page = sc.pages.find((p) => p.id === G.scenarioSession.pageId);
    scenarioGoto(G, page.after || "end");
  }

  function scenarioChoose(G, i) {
    const s = G.scenarioSession;
    const sc = getScenario(s.scId);
    const page = sc.pages.find((p) => p.id === s.pageId);
    const ch = page.choices[i];
    if (ch.delta) {
      const st = G.owned[s.charId];
      st.affection = clamp(st.affection + ch.delta, 0, 100);
      addLog(G, charDef(s.charId).name + "との関係：" + (ch.delta > 0 ? "+" : "") + ch.delta);
    }
    scenarioGoto(G, ch.next || "end");
  }

  return {
    charDef,
    getScenario,
    newGame,
    reconcile,
    advanceDay,
    finishWeek,
    chooseDayMenu,
    chooseActivity,
    selectContact,
    chooseLineChat,
    chooseDateInvite,
    chooseBoost,
    chooseDateStageNext,
    chooseDateStageHome,
    chooseDateStageEnd,
    pullGacha,
    closeDialog,
    scenarioNext,
    scenarioChoose,
  };
}
