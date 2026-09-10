"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const BUCKET = "media";

function slugId() {
  return crypto.randomUUID();
}

export default function ProfileForm({ initialProfile, initialMedia }) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = Boolean(initialProfile);

  const [name, setName] = useState(initialProfile?.name ?? "");
  const [catalogNo, setCatalogNo] = useState(initialProfile?.catalog_no ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [tags, setTags] = useState((initialProfile?.tags ?? []).join(", "));
  const [isPublished, setIsPublished] = useState(
    initialProfile?.is_published ?? false
  );
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(
    initialProfile?.cover_url ?? ""
  );

  const [existingMedia, setExistingMedia] = useState(initialMedia ?? []);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [newMediaAccessLevel, setNewMediaAccessLevel] = useState("member");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleNewMediaChange(e) {
    const files = Array.from(e.target.files ?? []);
    setNewMediaFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeNewMedia(index) {
    setNewMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function removeExistingMedia(item) {
    if (!confirm("このメディアを削除しますか？")) return;
    await supabase.from("media").delete().eq("id", item.id);
    setExistingMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  async function toggleExistingAccessLevel(item) {
    const next = item.access_level === "free" ? "member" : "free";
    await supabase.from("media").update({ access_level: next }).eq("id", item.id);
    setExistingMedia((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, access_level: next } : m))
    );
  }

  async function uploadFile(file, folder) {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${slugId()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let coverUrl = initialProfile?.cover_url ?? null;
      if (coverFile) {
        coverUrl = await uploadFile(coverFile, "covers");
      }

      const payload = {
        name,
        catalog_no: catalogNo || null,
        bio,
        tags: tagList,
        is_published: isPublished,
        cover_url: coverUrl,
      };

      let profileId = initialProfile?.id;

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", profileId);
        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        profileId = inserted.id;
      }

      for (const file of newMediaFiles) {
        const type = file.type.startsWith("video") ? "video" : "photo";
        const url = await uploadFile(file, `profiles/${profileId}`);
        const { error: mediaError } = await supabase.from("media").insert({
          profile_id: profileId,
          type,
          url,
          access_level: newMediaAccessLevel,
        });
        if (mediaError) throw mediaError;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err.message ?? "保存に失敗しました。時間をおいて再度お試しください。"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="name">名前</label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="catalogNo">図鑑No.（任意・例: 001）</label>
        <input
          id="catalogNo"
          type="text"
          value={catalogNo}
          onChange={(e) => setCatalogNo(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="bio">プロフィール紹介文</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="tags">タグ（カンマ区切り）</label>
        <input
          id="tags"
          type="text"
          placeholder="例: グラビア, クール系, 168cm"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="cover">カバー写真（一覧・詳細ページ上部に表示）</label>
        <input
          id="cover"
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
        />
        {coverPreview && (
          <div className="thumb-list">
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreview} alt="カバー写真プレビュー" />
            </div>
          </div>
        )}
      </div>

      <div className="form-row">
        <label htmlFor="media">
          写真・動画を追加（複数選択可 / 追加後に保存を押してください）
        </label>
        <input
          id="media"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleNewMediaChange}
        />

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            今回追加する分の公開設定:
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <input
              type="radio"
              name="newMediaAccessLevel"
              checked={newMediaAccessLevel === "member"}
              onChange={() => setNewMediaAccessLevel("member")}
              style={{ width: "auto" }}
            />
            会員限定
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <input
              type="radio"
              name="newMediaAccessLevel"
              checked={newMediaAccessLevel === "free"}
              onChange={() => setNewMediaAccessLevel("free")}
              style={{ width: "auto" }}
            />
            無料公開
          </label>
        </div>

        {existingMedia.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
              登録済みメディア（サムネイル下のボタンで公開設定を切替できます）
            </p>
            <div className="thumb-list">
              {existingMedia.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="thumb">
                    {m.type === "video" ? (
                      <video src={m.url} muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" />
                    )}
                    <button
                      type="button"
                      className="remove"
                      onClick={() => removeExistingMedia(m)}
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExistingAccessLevel(m)}
                    style={{
                      fontSize: 10,
                      padding: "3px 6px",
                      border: "1px solid var(--line)",
                      background: m.access_level === "free" ? "var(--forest-deep)" : "transparent",
                      color: m.access_level === "free" ? "var(--paper)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    {m.access_level === "free" ? "無料公開" : "会員限定"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {newMediaFiles.length > 0 && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
              新規追加分（未保存）
            </p>
            <div className="thumb-list">
              {newMediaFiles.map((file, i) => (
                <div key={i} className="thumb">
                  {file.type.startsWith("video") ? (
                    <video src={URL.createObjectURL(file)} muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={URL.createObjectURL(file)} alt="" />
                  )}
                  <button
                    type="button"
                    className="remove"
                    onClick={() => removeNewMedia(i)}
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input
          id="published"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          style={{ width: "auto" }}
        />
        <label htmlFor="published" style={{ margin: 0 }}>
          サイトに公開する
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存する"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push("/admin")}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
