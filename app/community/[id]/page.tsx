"use client";

/* eslint-disable @next/next/no-img-element -- private R2-backed media is served through the app route. */

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BrandLockup } from "../../components/brand-lockup";

type Challenge = { id: string; title: string; detail: string; xp: number };
type Room = { id: string; name: string; tag: string; motto: string; privacy: string; memberCount: number; capacity: number; score: number; tier: string; iconKey: string | null; weeklyPnl: string; integrityStatus: string; viewerRole: string | null; requested: number; calloutCount: number; members: { id: string; displayName: string; xp: number; memberStatus: string; role: string }[]; messages: { id: string; body: string; createdAt: string; authorName: string; authorRole: string | null }[]; callouts: { id: string; ticker: string; thesis: string; createdAt: string; authorName: string }[]; challenges: Challenge[] };
type Response = { community: Room; state: { completedChallengeIds: string[] } };

const initials = (name: string) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
const mediaUrl = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;
const date = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}Z`));

export default function CommunityRoom() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch(`/api/pocket?communityId=${encodeURIComponent(communityId)}`, { cache: "no-store" });
    const payload = await response.json() as Response & { error?: string };
    if (!response.ok) throw new Error(payload.error || "This community room could not load.");
    setData(payload);
  };

  useEffect(() => {
    let active = true;
    void fetch(`/api/pocket?communityId=${encodeURIComponent(communityId)}`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as Response & { error?: string } }))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error || "This community room could not load."); if (active) setData(payload); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "This community room could not load."); });
    return () => { active = false; };
  }, [communityId]);

  async function act(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, communityId }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "That action did not complete.");
      setNotice(result.message || "Saved."); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "That action did not complete."); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await act({ action: "send-message", body: form.get("body") }); event.currentTarget.reset(); }
  async function makeCallout(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await act({ action: "create-callout", ticker: form.get("ticker"), thesis: form.get("thesis") }); event.currentTarget.reset(); }

  const community = data?.community;
  if (!community && !error) return <main className="detail-page"><p className="detail-loading">Loading the community room…</p></main>;
  if (!community) return <main className="detail-page"><Link className="back-link" href="/">← Com-Munitiez</Link><div className="empty-panel"><h1>Room unavailable.</h1><p>{error}</p><button onClick={() => { setError(""); void load().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not reload.")); }}>Try again</button></div></main>;
  const joined = Boolean(community.viewerRole);

  return <main className="detail-page">
    <header className="detail-nav"><Link className="brand" href="/"><BrandLockup /></Link><nav><Link href="/">All communities</Link><Link href="/profile">My profile</Link></nav></header>
    <section className="room-hero"><div><Link className="back-link" href="/">← Community directory</Link><p className="kicker">{community.privacy} community · {community.memberCount}/{community.capacity} seats</p><div className="room-title"><span>{community.iconKey ? <img src={mediaUrl(community.iconKey)} alt="" /> : community.tag}</span><h1>{community.name}</h1></div><p>{community.motto}</p><div className="room-actions">{joined ? <span className="role-lock">{(community.viewerRole ?? "member").replace("_", " ")}</span> : <button className="primary-button" disabled={busy || Boolean(community.requested) || community.memberCount >= community.capacity} onClick={() => void act({ action: "join-community" })}>{community.requested ? "Invite requested" : community.memberCount >= community.capacity ? "At capacity" : community.privacy === "private" ? "Request invite" : "Join community"}</button>}<span className={`tier-chip ${community.tier}`}>{community.tier}</span></div></div><aside className="score-stamp"><span>Community score</span><strong>{community.score || "—"}</strong><b>{community.integrityStatus}</b></aside></section>
    {error && <div className="error-banner room-error" role="alert">{error}</div>}
    <section className="room-metrics"><article><span>Community PnL</span><strong className={Number(community.weeklyPnl) >= 0 ? "gain" : "loss"}>{Number(community.weeklyPnl) >= 0 ? "+" : ""}{community.weeklyPnl}%</strong><small>This week · shared battle</small></article><article><span>Active callouts</span><strong>{community.callouts.length}</strong><small>Community record, not a solo feed</small></article><article><span>Integrity status</span><strong>{community.integrityStatus.startsWith("0") ? "Clear" : "Watch"}</strong><small>Graph and hold checks are queued</small></article><article><span>Weekly rank</span><strong>#2</strong><small>Across active communities</small></article></section>
    <section className="room-layout">
      <div className="room-primary">
        <section className="room-panel talk-panel"><div className="panel-heading"><div><p className="kicker">Community talk</p><h2>The room</h2></div><span>{community.messages.length} notes</span></div><div className="message-list">{community.messages.length ? community.messages.map((message) => <article key={message.id}><span className="message-avatar">{initials(message.authorName)}</span><div><div><b>{message.authorName}</b><small>{message.authorRole?.replace("_", " ") || "member"} · {date(message.createdAt)}</small></div><p>{message.body}</p></div></article>) : <p className="empty-copy">No notes yet. Set the tone.</p>}</div>{joined ? <form className="message-form" onSubmit={sendMessage}><label htmlFor="message">Add to the room</label><textarea id="message" name="body" minLength={1} maxLength={500} required placeholder="Share a thesis update, receipt, or rally note." /><button className="dark-button" disabled={busy} type="submit">Post note</button></form> : <p className="locked-copy">Join this community to participate in its conversation.</p>}</section>
        <section className="room-panel"><div className="panel-heading"><div><p className="kicker">Active callouts</p><h2>On the record</h2></div><span>{community.callouts.length} live</span></div>{community.callouts.length ? <div className="callout-list">{community.callouts.map((callout) => <article key={callout.id}><b>{callout.ticker}</b><p>{callout.thesis}</p><small>{callout.authorName} · {date(callout.createdAt)}</small></article>)}</div> : <p className="empty-copy">There are no community callouts yet.</p>}{joined && <form className="callout-form" onSubmit={makeCallout}><input aria-label="Ticker" name="ticker" minLength={2} maxLength={12} required placeholder="Ticker" /><input aria-label="Callout thesis" name="thesis" minLength={12} maxLength={280} required placeholder="Why should the community pay attention?" /><button disabled={busy} type="submit">Publish</button></form>}</section>
      </div>
      <aside className="room-aside"><section className="room-panel challenges-panel"><p className="kicker">Challenges</p><h2>Grow the flag.</h2>{community.challenges.map((challenge) => { const done = data?.state.completedChallengeIds.includes(challenge.id); return <article key={challenge.id}><div><b>{challenge.title}</b><p>{challenge.detail}</p></div><button disabled={busy || done} onClick={() => void act({ action: "complete-challenge", challengeId: challenge.id })}>{done ? "Done" : `+${challenge.xp}`}</button></article>; })}</section><section className="room-panel members-panel"><div className="panel-heading"><div><p className="kicker">Member roster</p><h2>People in the room</h2></div><span>{community.memberCount}</span></div>{community.members.map((member) => <article key={member.id}><span>{initials(member.displayName)}</span><div><b>{member.displayName}</b><small>{member.memberStatus} · {member.xp} XP</small></div><em>{member.role.replace("_", " ")}</em></article>)}<p className="roster-note">Showing active roster members. Capacity: {community.capacity}.</p></section></aside>
    </section>
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
