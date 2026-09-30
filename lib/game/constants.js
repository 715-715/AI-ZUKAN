// ゲーム全体で使う定数（数値バランスはここを調整する）

export const BOARD_LENGTH = 7; // 1週間＝7マス（最終マスは週次まとめ）

export const SKILL_LABELS = {
  intelligence: "知性",
  sensibility: "感性",
  passion: "パッション",
  muscle: "筋肉",
  looks: "ルックス",
  curiosity: "好奇心",
};

export const SKILL_EMOJI = {
  intelligence: "📖",
  sensibility: "🎨",
  passion: "🔥",
  muscle: "💪",
  looks: "💄",
  curiosity: "🧭",
};

// 自分磨きで選べる活動
export const ACTIVITIES = [
  { id: "library", label: "図書館に行く", emoji: "📚", skill: "intelligence" },
  { id: "museum", label: "美術館に行く", emoji: "🖼️", skill: "sensibility" },
  { id: "sports", label: "スポーツ観戦に行く", emoji: "⚽", skill: "passion" },
  { id: "salon", label: "美容院に行く", emoji: "💇", skill: "looks" },
  { id: "gym", label: "ジムに行く", emoji: "🏋️", skill: "muscle" },
  { id: "travel", label: "旅行に行く", emoji: "✈️", skill: "curiosity" },
  { id: "home", label: "家で過ごす", emoji: "🏠", skill: null, energy: 1 },
];

// シナリオが発生する場面
export const SCENE_LABELS = {
  line: "LINEで話す時",
  date: "デート中（各軒のあと）",
  home: "家に誘って成功した時",
};

export const TUNING = {
  DATE_AFFECTION_THRESHOLD: 28, // この親密度以上でデートに誘える
  BASE_SUCCESS_RATE: 0.5, // 「家に誘う」の基本成功率
  BOOSTED_SUCCESS_RATE: 0.85, // エナジーで準備した時の成功率
  ENERGY_BOOST_COST: 8,
  GACHA_COST: 5,
  ENCOUNTER_RATE: 0.35, // 自分磨きで新しい子と出会う基本確率
  START_AFFECTION: 20,
  LINE_BASE_GAIN: 3,
  DATE_STOP_GAIN: 3,
};
