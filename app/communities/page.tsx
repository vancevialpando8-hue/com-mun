"use client";

/* eslint-disable @next/next/no-img-element -- private R2-backed flags are served through the app route. */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLockup } from "../components/brand-lockup";

type Community = { id: string; name: string; tag: string; motto: string; privacy: "public" | "private"; memberCount: number; capacity: number; score: number; tier: "bronze" | "silver" | "gold" | "diamond"; iconKey: string | null; weeklyPnl: string; integrityStatus: string; viewerRole: string | null; requested: number; calloutCount: number };
type CommunityState = { communities: Community[]; viewer: { walletAddress: string | null } };

const mediaUrl = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;

export default function CommunitiesPage() {
  const [state, setState] = useState<CommunityState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    const response = await fetch("/api/pocket", { cache: "no-store" });
    const payload = await response.json() as CommunityState & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Communities could not load.");
    setState(payload);
  };

  useEffect(() => {
    let active = true;
    void fetch("/api/pocket", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as CommunityState & { error?: string } }))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error || "Communities could not load."); if (active) setState(payload); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Communities could not load."); });
    return () => { active = false; };
  }, []);

  async function join(community: Community) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-community", communityId: community.id }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "The crew could not be joined.");
      setNotice(result.message || "Saved."); await load();
    } catch (joinError) { setError(joinError instanceof Error ? joinError.message : "The crew could not be joined."); }
    finally { setBusy(false); }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-community", name: form.get("name"), motto: form.get("motto"), privacy: form.get("privacy") }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "The group could not be created.");
      setNotice(result.message || "Group created."); setCreateOpen(false); await load();
    } catch (createError) { setError(createError instanceof Error ? createError.message : "The group could not be created."); }
    finally { setBusy(false); }
  }

  if (!state && !error) return <main className="detail-page"><p className="detail-loading">Loading the crew directory…</p></main>;
  if (!state) return <main className="detail-page"><Link className="back-link" href="/profile">← Your profile</Link><div className="empty-panel"><h1>Directory unavailable.</h1><p>{error}</p><button onClick={() => { setError(""); void load().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not reload.")); }}>Try again</button></div></main>;

  const currentCrew = state.communities.find((community) => community.viewerRole);
  const walletConnected = Boolean(state.viewer.walletAddress);
  const rankedCommunities = [...state.communities].sort((left, right) => right.score - left.score);
  const connectWallet = () => { window.location.assign("/profile"); };
  const openCreateGroup = () => {
    if (!walletConnected) { connectWallet(); return; }
    if (currentCrew) { setNotice(`You are already in ${currentCrew.name}. Leave it before creating a new group.`); return; }
    setCreateOpen(true);
  };

  return <main className="detail-page communities-page">
    <header className="detail-nav"><Link className="brand" href="/"><BrandLockup /></Link><nav><Link href="/communities">Explore communities</Link><Link href="/profile">My profile</Link></nav></header>
    <section className="communities-hero"><div><Link className="back-link" href="/profile">← Your profile</Link><p className="kicker">Crew directory</p><h1>Pick one flag.<br /><em>Make it count.</em></h1><p>Every member commits to one crew at a time. Choose the people, culture, and record you want your name beside.</p></div><aside className="crew-commitment"><span>Membership rule</span><strong>1</strong><b>crew at a time</b><p>{currentCrew ? <>You currently fly <Link href={`/community/${currentCrew.id}`}>{currentCrew.name}</Link>.</> : "No flag selected yet. Find the crew you want to help build."}</p></aside></section>
    {error && <div className="error-banner room-error" role="alert">{error}</div>}
    <section className="communities-directory"><div className="directory-heading"><div><p className="kicker">Active crews</p><h2>Read the room.</h2></div><div className="directory-heading-actions"><span>{rankedCommunities.length} crews on the board</span><button className="primary-button" onClick={openCreateGroup}>{walletConnected ? "Create group" : "Connect wallet"}</button></div></div><div className="community-card-list">{rankedCommunities.map((community, index) => {
      const joined = Boolean(community.viewerRole); const locked = Boolean(currentCrew && !joined); const full = community.memberCount >= community.capacity; const requested = Boolean(community.requested);
      const actionLabel = !walletConnected ? "Connect wallet" : joined ? community.viewerRole === "leader" ? "Your crew" : "Leave from home" : requested ? "Invite requested" : locked ? "In a crew" : full ? "At capacity" : community.privacy === "private" ? "Request invite" : "Join crew";
      return <article className="community-card" key={community.id}><span className="community-rank">0{index + 1}</span><span className="community-card-flag">{community.iconKey ? <img src={mediaUrl(community.iconKey)} alt="" /> : community.tag}</span><div className="community-card-main"><div><Link href={`/community/${community.id}`}><h3>{community.name}</h3></Link><span className={`tier-chip ${community.tier}`}>{community.tier}</span><span className="privacy-label">{community.privacy}</span></div><p>{community.motto}</p><small>{community.memberCount}/{community.capacity} members · {community.calloutCount} active calls · {community.integrityStatus}</small></div><div className="community-card-score"><span>Crew score</span><strong>{community.score || "—"}</strong></div><div className="community-card-action"><b className={Number(community.weeklyPnl) >= 0 ? "gain" : "loss"}>{Number(community.weeklyPnl) >= 0 ? "+" : ""}{community.weeklyPnl}%</b>{joined ? <Link className="joined-button" href={`/community/${community.id}`}>{actionLabel}</Link> : <button className="join-button" disabled={busy || (walletConnected && (requested || locked || full))} onClick={() => walletConnected ? void join(community) : connectWallet()}>{actionLabel}</button>}</div></article>;
    })}</div></section>
    {createOpen && <div className="modal-wrap" role="presentation"><form className="modal" onSubmit={createGroup} aria-labelledby="create-group-title"><button type="button" className="close" aria-label="Close" onClick={() => setCreateOpen(false)}>Close</button><p className="kicker">Create group</p><h2 id="create-group-title">Give your people a flag.</h2><p>Every new group starts at Bronze tier. You can add a flag after the group is created.</p><label>Group name<input name="name" minLength={3} maxLength={28} required placeholder="The Real Ones" /></label><label>Culture line<input name="motto" minLength={4} maxLength={90} required placeholder="What this group stands for" /></label><fieldset><legend>Visibility</legend><label className="radio"><input type="radio" name="privacy" value="public" defaultChecked />Public <small>Anyone can join while there is room.</small></label><label className="radio"><input type="radio" name="privacy" value="private" />Private <small>Members request an invite.</small></label></fieldset><button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating…" : "Create group"}</button></form></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
