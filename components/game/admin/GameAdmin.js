"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import CharacterAdmin from "./CharacterAdmin";
import ScenarioAdmin from "./ScenarioAdmin";

const BUCKET = "media";

const fromCharRow = (r) => ({
  id: r.id,
  isNew: false,
  name: r.name,
  emoji: r.emoji,
  tagline: r.tagline,
  favSkill: r.fav_skill,
  faceUrl: r.face_url,
  pool: Array.isArray(r.pool) ? r.pool : [],
  sortOrder: r.sort_order,
  isPublished: r.is_published,
});
const fromScenarioRow = (r) => ({
  id: r.id,
  title: r.title,
  charId: r.char_id,
  scene: r.scene,
  stop: r.stop,
  minAffection: r.min_affection,
  once: r.once,
  enabled: r.enabled,
  pages: Array.isArray(r.pages) ? r.pages : [],
});

export default function GameAdmin() {
  const supabase = useMemo(() => createClient(), []);
  const [section, setSection] = useState("scenario");
  const [characters, setCharacters] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("game_characters").select("*").order("sort_order", { ascending: true }),
        supabase.from("game_scenarios").select("*").order("created_at", { ascending: true }),
      ]);
      if (c.error || s.error) setError((c.error || s.error).message);
      setCharacters((c.data || []).map(fromCharRow));
      setScenarios((s.data || []).map(fromScenarioRow));
      setLoading(false);
    })();
  }, [supabase]);

  // 写真・動画を Storage にアップロードして公開URLを返す
  const uploadMedia = async (file, folder) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="rg">
      <div className="container" style={{ maxWidth: 720, paddingTop: 24, paddingBottom: 80 }}>
        <div className="tabbar" style={{ marginBottom: 14 }}>
          <button className={"btn small " + (section === "scenario" ? "" : "outline")} onClick={() => setSection("scenario")}>
            📖 シナリオ
          </button>
          <button className={"btn small " + (section === "chars" ? "" : "outline")} onClick={() => setSection("chars")}>
            👩 キャラクター
          </button>
        </div>

        {error && (
          <p className="hint" style={{ color: "#7a2f22", marginBottom: 10 }}>
            読み込みエラー: {error}（supabase/game_schema.sql を実行済みか、管理者として登録されているか確認してください）
          </p>
        )}

        {loading ? (
          <p className="hint">読み込み中…</p>
        ) : section === "chars" ? (
          <CharacterAdmin characters={characters} setCharacters={setCharacters} supabase={supabase} uploadMedia={uploadMedia} />
        ) : (
          <ScenarioAdmin
            scenarios={scenarios}
            setScenarios={setScenarios}
            characters={characters}
            supabase={supabase}
            uploadMedia={uploadMedia}
          />
        )}
      </div>
    </div>
  );
}
