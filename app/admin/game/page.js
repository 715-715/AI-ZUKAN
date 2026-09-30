import Link from "next/link";
import GameAdmin from "@/components/game/admin/GameAdmin";
import "../../play/play.css";

export const metadata = { title: "ゲーム管理" };

// /admin 配下は middleware でログイン必須。データ操作は RLS（is_admin）でも保護されている。
export default function AdminGamePage() {
  return (
    <div className="admin-shell">
      <header className="site-header">
        <div className="site-title">
          AI美女図鑑
          <small>Game Admin</small>
        </div>
        <nav className="site-nav" style={{ display: "flex", gap: 18 }}>
          <Link href="/admin">投稿管理へ</Link>
          <Link href="/play">ゲームを見る</Link>
        </nav>
      </header>
      <GameAdmin />
    </div>
  );
}
