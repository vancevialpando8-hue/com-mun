"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Community = { id: string; name: string; tag: string; motto: string; privacy: "public" | "private"; memberCount: number; capacity: number; score: number; tier: "rookie" | "silver" | "gold" | "diamond"; weeklyPnl: string; integrityStatus: string; viewerRole: string | null; requested: number; calloutCount: number };
type Challenge = { id: string; title: string; detail: string; xp: number };
type PocketState = { viewer: { id: string; displayName: string; xp: number; referrals: number }; communities: Community[]; callouts: { id: string; ticker: string; thesis: string; createdAt: string; communityName: string; communityTag: string; authorName: string }[]; challenges: Challenge[]; completedChallengeIds: string[] };

const levelFor = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);
const initials = (name: string) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState<PocketState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    const response = await fetch("/api/pocket", { cache: "no-store" });
    const payload = await response.json() as PocketState & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Pocket could not load.");
    setState(payload);
  };

  useEffect(() => {
    let active = true;
    void fetch("/api/pocket", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as PocketState & { error?: string } }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) throw new Error(payload.error || "Pocket could not load.");
        setState(payload);
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Pocket could not load."); });
    return () => { active = false; };
  }, []);

  useGSAP(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const context = gsap.context(() => {
      gsap.fromTo(".hero-copy, .hero-actions", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" });
      gsap.fromTo(".scrub-word", { opacity: 0.12 }, { opacity: 1, stagger: 0.06, scrollTrigger: { trigger: ".score-intro", start: "top 72%", end: "bottom 58%", scrub: true } });
      const media = gsap.matchMedia();
      media.add("(min-width: 960px)", () => {
        ScrollTrigger.create({ trigger: ".journey-shell", start: "top 18%", end: "bottom bottom", pin: ".journey-title", pinSpacing: false });
        gsap.utils.toArray<HTMLElement>(".journey-card").forEach((card) => {
          gsap.fromTo(card, { scale: 0.88, opacity: 0.25 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: card, start: "top 82%", end: "top 30%", scrub: true } });
        });
      });
      return () => media.revert();
    }, root);
    return () => context.revert();
  }, { scope: root, dependencies: [state] });

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string; message?: string; state?: PocketState };
      if (!response.ok) throw new Error(result.error || "That action did not complete.");
      if (result.state) setState(result.state);
      announce(result.message || "Saved.");
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "That action did not complete.");
      return false;
    } finally { setBusy(false); }
  }

  async function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const done = await act({ action: "create-community", name: form.get("name"), motto: form.get("motto"), privacy: form.get("privacy") });
    if (done) setCreateOpen(false);
  }

  async function createCallout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const done = await act({ action: "create-callout", communityId: form.get("communityId"), ticker: form.get("ticker"), thesis: form.get("thesis") });
    if (done) setCalloutOpen(false);
  }

  const mine = state?.communities.filter((community) => community.viewerRole) ?? [];
  const leaderCrew = mine.find((community) => community.viewerRole === "leader") ?? mine[0];
  const xp = state?.viewer.xp ?? 0;
  const openCallout = (communityId = mine[0]?.id ?? "") => {
    setSelectedCrew(communityId);
    setCalloutOpen(true);
  };

  return <main className="pocket-app" ref={root}>
    <header className="nav-shell"><a className="brand" href="#top" aria-label="Pocket home"><span className="brand-bars"><i /><i /><i /></span>pocket</a><nav aria-label="Main navigation"><a href="#crews">Crews</a><a href="#journey">Progress</a><a href="#battles">Battles</a></nav><div className="nav-actions"><button className="profile-button" onClick={() => document.getElementById("member-profile")?.scrollIntoView({ behavior: "smooth" })}>{state ? initials(state.viewer.displayName) : "--"}<span>{state?.viewer.displayName ?? "Loading"}</span></button><button className="nav-cta" onClick={() => setCreateOpen(true)}>Start a crew</button></div></header>

    <section className="hero" id="top"><div className="hero-copy-wrap"><p className="kicker">A reputation you build together</p><h1>Make the call.<br /><em>Keep the culture.</em></h1><p className="hero-copy">Pocket is where tight crews discover, study, and earn around calls together. Every action compounds into a score the whole community owns.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("crews")?.scrollIntoView({ behavior: "smooth" })}>Find your crew</button><button className="secondary-button" onClick={() => setCreateOpen(true)}>Build a crew</button></div></div><div className="hero-image" aria-hidden="true"><div className="image-wash" /></div></section>

    <div className="marquee" aria-label="Pocket activity"><div className="marquee-track"><span>Verified hold time</span><b>•</b><span>Fifty people per crew</span><b>•</b><span>Weekly prize pools</span><b>•</b><span>Public reputation</span><b>•</b><span>Verified hold time</span><b>•</b><span>Fifty people per crew</span><b>•</b><span>Weekly prize pools</span><b>•</b><span>Public reputation</span><b>•</b></div></div>

    <section className="crew-section" id="crews"><div className="section-heading"><div><p className="kicker">Community directory</p><h2>Find a flag worth flying.</h2></div><div className="heading-actions"><button className="text-action" onClick={() => openCallout()} disabled={!mine.length}>Publish a callout</button><button className="outline-button" onClick={() => setCreateOpen(true)}>Start a crew</button></div></div>{error && <div className="error-banner" role="alert">{error}<button onClick={() => load().catch(() => undefined)}>Retry</button></div>}
      {!state && !error && <div className="loading-state" role="status">Loading your Pocket...</div>}
      {state && <div className="bento-grid">
        <section className="bento bento-profile" id="member-profile"><div className="profile-top"><span className="member-badge">{initials(state.viewer.displayName)}</span><div><p className="kicker">Member badge</p><h3>{state.viewer.displayName}</h3></div><span className="level">Level {levelFor(xp)}</span></div><p className="profile-copy">Show up for your crew, complete challenges, and earn a reputation members can trust.</p><div className="xp-row"><span>Community XP</span><b>{xp} / {levelFor(xp) * 250} XP</b></div><div className="xp-bar"><i style={{ width: `${Math.min(100, (xp % 250) / 2.5)}%` }} /></div><div className="profile-foot"><span><b>{mine.length}</b> crews</span><span><b>{state.viewer.referrals}</b> referrals</span><span><b>{state.completedChallengeIds.length}</b> challenges</span></div></section>
        <section className="bento bento-crew"><p className="kicker">Your active crew</p>{leaderCrew ? <><div className="crew-identity"><span className="crew-crest">{leaderCrew.tag}</span><div><h3>{leaderCrew.name}</h3><p>{leaderCrew.motto}</p></div><b className={`tier-chip ${leaderCrew.tier}`}>{leaderCrew.tier}</b></div><div className="crew-numbers"><span><b>{leaderCrew.memberCount}</b>/50 members</span><span><b>{leaderCrew.score || "Not rated"}</b>{leaderCrew.score ? "/100 score" : ""}</span><span><b>{leaderCrew.calloutCount}</b> calls</span></div><button className="dark-button" onClick={() => { setSelectedCrew(leaderCrew.id); setCalloutOpen(true); }}>Make a callout</button></> : <><h3>No crew yet.</h3><p>Join a public crew or create the culture you want to be part of.</p><button className="dark-button" onClick={() => setCreateOpen(true)}>Start a crew</button></>}</section>
        <section className="bento bento-challenges"><div className="challenge-title"><div><p className="kicker">Build the culture</p><h3>Daily challenges</h3></div><span>{state.completedChallengeIds.length}/{state.challenges.length}</span></div><div className="challenge-list">{state.challenges.map((challenge) => { const done = state.completedChallengeIds.includes(challenge.id); return <article key={challenge.id}><div><b>{challenge.title}</b><p>{challenge.detail}</p></div><button disabled={done || busy} onClick={() => act({ action: "complete-challenge", communityId: mine[0]?.id ?? "challenge", challengeId: challenge.id })}>{done ? "Complete" : `+${challenge.xp} XP`}</button></article>; })}</div></section>
        <section className="bento bento-integrity"><div><p className="kicker">Built-in integrity</p><h3>Culture needs receipts.</h3><p>Every score takes hold duration, call quality, community growth, and manipulation checks into account.</p></div><div className="integrity-grid"><span>Wallet graph</span><b>Active</b><span>Bundle checks</span><b>Active</b><span>Hold receipts</span><b>Active</b></div></section>
      </div>}
      {state && <div className="directory-list">{state.communities.map((community) => { const joined = Boolean(community.viewerRole); const full = community.memberCount >= community.capacity; const requested = Boolean(community.requested); return <article className="community-row" key={community.id}><span className="community-symbol">{community.tag}</span><div className="community-main"><div><h3>{community.name}</h3><span className={`tier-chip ${community.tier}`}>{community.tier}</span><span className="privacy-label">{community.privacy}</span></div><p>{community.motto}</p><small>{community.memberCount}/{community.capacity} members · {community.calloutCount} live callouts · {community.integrityStatus}</small></div><div className="community-score"><span>Crew score</span><strong>{community.score || "—"}</strong></div><div className="community-side"><b className={Number(community.weeklyPnl) >= 0 ? "gain" : "loss"}>{Number(community.weeklyPnl) >= 0 ? "+" : ""}{community.weeklyPnl}%</b><button className={joined ? "joined-button" : "join-button"} disabled={busy || requested || (!joined && full)} onClick={() => act({ action: joined ? "leave-community" : "join-community", communityId: community.id })}>{joined ? community.viewerRole === "leader" ? "Leader" : "Leave" : requested ? "Requested" : full ? "Full" : community.privacy === "private" ? "Request invite" : "Join crew"}</button></div></article>; })}</div>}
    </section>

    <section className="journey-shell" id="journey"><div className="journey-title"><p className="kicker">Reputation is a group project</p><h2>How a crew<br />gets known.</h2><p>Scores are designed to reward the behavior that makes a community worth joining.</p></div><div className="journey-list"><article className="journey-card"><span>01</span><h3>Make a call</h3><p>The first verified callout starts a crew’s public score. Calls never become a solo popularity contest.</p></article><article className="journey-card"><span>02</span><h3>Hold together</h3><p>Members are rewarded for behavior over time. Short-term tails do not outrank proven conviction.</p></article><article className="journey-card"><span>03</span><h3>Grow with standards</h3><p>Bring in active members, complete challenges, and win battles without market-manipulation flags.</p></article></div></section>

    <section className="score-intro"><p>{"The best communities do not chase a number. They build a culture that earns one.".split(" ").map((word, index) => <span className="scrub-word" key={`${word}-${index}`}>{word} </span>)}</p></section>

    <section className="battle-section" id="battles"><div className="battle-intro"><p className="kicker">Weekly community battle</p><h2>There is a pot<br />for showing up.</h2><p>Each week, crews compete on verified call performance. The leaderboard updates with the actions that actually matter, and the winning community takes the pool.</p><button className="primary-button" onClick={() => document.getElementById("crews")?.scrollIntoView({ behavior: "smooth" })}>Join a contender</button></div><div className="battle-board">{state?.communities.slice(0, 3).map((community, index) => <article className="battle-entry" key={community.id}><span>0{index + 1}</span><b className="battle-tag">{community.tag}</b><div><h3>{community.name}</h3><p>{community.memberCount} members · {community.calloutCount} calls</p></div><strong>+{community.weeklyPnl}%</strong></article>) ?? <div className="battle-loading">Loading battle board...</div>}<div className="battle-pot"><span>This week’s shared pot</span><strong>18,400 <small>PTS</small></strong><p>Diamond banner and distribution to the top crew.</p></div></div></section>

    <section className="action-section"><p className="kicker">Your table is waiting</p><h2>Start with the people<br />you would hold with.</h2><div><button className="primary-button" onClick={() => setCreateOpen(true)}>Start a community</button><button className="secondary-button light" onClick={() => document.getElementById("crews")?.scrollIntoView({ behavior: "smooth" })}>Explore crews</button></div></section>
    <footer><a className="brand" href="#top"><span className="brand-bars"><i /><i /><i /></span>pocket</a><span>Better together, on chain.</span><span>© 2026 Pocket Protocol</span></footer>

    {createOpen && <div className="modal-wrap" role="presentation"><form className="modal" onSubmit={createCommunity} aria-labelledby="create-title"><button type="button" className="close" aria-label="Close" onClick={() => setCreateOpen(false)}>Close</button><p className="kicker">Start a crew</p><h2 id="create-title">Give people a flag.</h2><p>Every community begins at Rookie tier. Publish its first callout to begin a public score.</p><label>Community name<input name="name" minLength={3} maxLength={28} required placeholder="The Real Ones" /></label><label>Culture line<input name="motto" minLength={4} maxLength={90} required placeholder="Why this crew exists" /></label><fieldset><legend>Visibility</legend><label className="radio"><input type="radio" name="privacy" value="public" defaultChecked />Public <small>Anyone can join while there is room.</small></label><label className="radio"><input type="radio" name="privacy" value="private" />Private <small>Members request an invite to join.</small></label></fieldset><button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating..." : "Create community"}</button></form></div>}
    {calloutOpen && <div className="modal-wrap" role="presentation"><form className="modal" onSubmit={createCallout} aria-labelledby="callout-title"><button type="button" className="close" aria-label="Close" onClick={() => setCalloutOpen(false)}>Close</button><p className="kicker">Crew callout</p><h2 id="callout-title">Put it on the record.</h2><p>Callouts are community actions. They affect the crew’s score only after integrity and hold-time checks.</p><label>Community<select name="communityId" value={selectedCrew || mine[0]?.id || ""} onChange={(event) => setSelectedCrew(event.target.value)} required>{mine.map((community) => <option value={community.id} key={community.id}>{community.name}</option>)}</select></label><label>Ticker<input name="ticker" minLength={2} maxLength={12} required placeholder="MOGU" /></label><label>Thesis<textarea name="thesis" minLength={12} maxLength={280} required placeholder="What is the signal, and why is this worth the crew's attention?" /></label><button className="primary-button" type="submit" disabled={busy || !mine.length}>{busy ? "Publishing..." : "Publish callout"}</button></form></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
