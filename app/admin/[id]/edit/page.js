import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ProfileForm from "../../ProfileForm";

export default async function EditProfilePage({ params }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!profile) notFound();

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("profile_id", params.id)
    .order("sort_order", { ascending: true });

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
          <h1 className="admin-title">プロフィール編集</h1>
          <ProfileForm initialProfile={profile} initialMedia={media ?? []} />
        </div>
      </div>
    </div>
  );
}
