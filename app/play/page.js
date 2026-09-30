import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Game from "@/components/game/Game";
import "./play.css";

export const revalidate = 0;
export const metadata = { title: "AI恋愛図鑑" };

// DBの行 → ゲームエンジンが使う形
function toCharacter(r) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    tagline: r.tagline,
    favSkill: r.fav_skill,
    faceUrl: r.face_url,
    pool: Array.isArray(r.pool) ? r.pool : [],
  };
}
function toScenario(r) {
  return {
    id: r.id,
    title: r.title,
    charId: r.char_id,
    scene: r.scene,
    stop: r.stop,
    minAffection: r.min_affection,
    once: r.once,
    enabled: r.enabled,
    pages: Array.isArray(r.pages) ? r.pages : [],
  };
}

export default async function PlayPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/play");

  const [chars, scenarios, save] = await Promise.all([
    supabase.from("game_characters").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
    supabase.from("game_scenarios").select("*").eq("enabled", true),
    supabase.from("game_saves").select("data").eq("user_id", user.id).maybeSingle(),
  ]);

  const characters = (chars.data || []).map(toCharacter);
  const ids = new Set(characters.map((c) => c.id));
  const content = {
    characters,
    scenarios: (scenarios.data || []).map(toScenario).filter((s) => ids.has(s.charId)),
  };

  return <Game content={content} initialSave={save.data ? save.data.data : null} userId={user.id} />;
}
