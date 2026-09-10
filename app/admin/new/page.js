import Link from "next/link";
import ProfileForm from "../ProfileForm";

export default function NewProfilePage() {
  return (
    <div className="admin-shell">
      <header className="site-header">
        <div className="site-title">
          AI美女図鑑
          <small>Admin</small>
        </div>
        <nav className="site-nav">
          <Link href="/admin">一覧へ戻る</Link>
        </nav>
      </header>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
        <div className="admin-panel">
          <h1 className="admin-title">新規プロフィール登録</h1>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}
