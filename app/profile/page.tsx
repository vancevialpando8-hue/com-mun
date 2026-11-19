"use client";

/* eslint-disable @next/next/no-img-element -- private R2-backed media is served through the app route. */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLockup } from "../components/brand-lockup";

type Community = { id: string; viewerRole: string | null };
type ProfileState = { viewer: { displayName: string; xp: number; referrals: number; avatarKey: string | null; memberStatus: string }; communities: Community[]; completedChallengeIds: string[] };

const levelFor = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);
const initials = (name: string) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
const mediaUrl = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;

export default function Profile() {
  const [state, setState] = useState<ProfileState | null>(null); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const load = async () => { const response = await fetch("/api/pocket", { cache: "no-store" }); const payload = await response.json() as ProfileState & { error?: string }; if (!response.ok) throw new Error(payload.error || "Your profile could not load."); setState(payload); };
  useEffect(() => { let active = true; void fetch("/api/pocket", { cache: "no-store" }).then(async (response) => ({ response, payload: await response.json() as ProfileState & { error?: string } })).then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error || "Your profile could not load."); if (active) setState(payload); }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Your profile could not load."); }); return () => { active = false; }; }, []);
  async function saveAvatar(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const image = new FormData(event.currentTarget).get("avatar"); if (!(image instanceof File) || image.size === 0) { setError("Choose a profile photo first."); return; } setBusy(true); setError(""); try { const upload = new FormData(); upload.append("scope", "avatar"); upload.append("image", image); const uploadResponse = await fetch("/api/media", { method: "POST", body: upload }); const uploaded = await uploadResponse.json() as { key?: string; error?: string }; if (!uploadResponse.ok || !uploaded.key) throw new Error(uploaded.error || "Profile photo could not upload."); const saveResponse = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-avatar", avatarKey: uploaded.key }) }); const saved = await saveResponse.json() as { error?: string; message?: string }; if (!saveResponse.ok) throw new Error(saved.error || "Profile photo could not save."); setNotice(saved.message || "Profile photo saved."); await load(); event.currentTarget.reset(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Profile photo could not save."); } finally { setBusy(false); } }
  if (!state && !error) return <main className="detail-page"><p className="detail-loading">Loading your profile…</p></main>;
  if (!state) return <main className="detail-page"><Link className="back-link" href="/">← Com-Munitiez</Link><div className="empty-panel"><h1>Profile unavailable.</h1><p>{error}</p></div></main>;
  const { viewer } = state; const crews = state.communities.filter((community) => community.viewerRole);
  return <main className="detail-page profile-page"><header className="detail-nav"><Link className="brand" href="/"><BrandLockup /></Link><nav><Link href="/communities">Explore crews</Link><Link href="/profile">My profile</Link></nav></header>
    <section className="profile-hero"><div className="profile-avatar">{viewer.avatarKey ? <img src={mediaUrl(viewer.avatarKey)} alt="" /> : initials(viewer.displayName)}</div><div><p className="kicker">Member profile</p><h1>{viewer.displayName}</h1><p>{viewer.memberStatus} · Level {levelFor(viewer.xp)} · reputation built with the crew</p><form className="profile-photo-form" onSubmit={saveAvatar}><label htmlFor="avatar">Update photo<input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required /></label><button disabled={busy} type="submit">{busy ? "Saving…" : "Save photo"}</button></form></div><div className="profile-xp"><span>Community XP</span><strong>{viewer.xp}</strong><i><b style={{ width: `${Math.min(100, (viewer.xp % 250) / 2.5)}%` }} /></i><small>{viewer.xp % 250} / 250 to next level</small></div></section>
    {error && <div className="error-banner room-error" role="alert">{error}</div>}
    <section className="profile-stats"><article><span>Status</span><strong>{viewer.memberStatus}</strong><small>Earned through participation</small></article><article><span>Communities</span><strong>{crews.length}</strong><small>Current memberships</small></article><article><span>Completed challenges</span><strong>{state.completedChallengeIds.length}</strong><small>Culture-building actions</small></article><article><span>Referrals</span><strong>{viewer.referrals}</strong><small>Verified people brought in</small></article></section>
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
