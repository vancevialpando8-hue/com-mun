"use client";

/* eslint-disable @next/next/no-img-element -- private R2-backed media is served through the app route. */

import { FormEvent, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import Link from "next/link";
import { BrandLockup } from "./components/brand-lockup";


type Community = { id: string; name: string; tag: string; motto: string; privacy: "public" | "private"; memberCount: number; capacity: number; score: number; tier: "bronze" | "silver" | "gold" | "diamond"; iconKey: string | null; weeklyPnl: string; integrityStatus: string; viewerRole: string | null; requested: number; calloutCount: number };
type Challenge = { id: string; title: string; detail: string; xp: number };
type PocketState = { viewer: { id: string; displayName: string; xp: number; referrals: number; walletAddress: string | null; walletPnl: string; avatarKey: string | null; memberStatus: string }; communities: Community[]; callouts: { id: string; ticker: string; thesis: string; createdAt: string; communityName: string; communityTag: string; authorName: string }[]; challenges: Challenge[]; completedChallengeIds: string[] };

const levelFor = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);
const initials = (name: string) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
const mediaUrl = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [state, setState] = useState<PocketState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState("");
  const [busy, setBusy] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);

  const load = async () => {
    setError("");
    const response = await fetch("/api/pocket", { cache: "no-store" });
    const payload = await response.json() as PocketState & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Com-Munitiez could not load.");
    setState(payload);
  };

  useEffect(() => {
    let active = true;
    void fetch("/api/pocket", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as PocketState & { error?: string } }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) throw new Error(payload.error || "Com-Munitiez could not load.");
        setState(payload);
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Com-Munitiez could not load."); });
    return () => { active = false; };
  }, []);

  useGSAP(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const context = gsap.context(() => {
      gsap.fromTo(".hero-copy, .hero-actions", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" });
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
    const icon = form.get("icon");
    let iconKey: string | null = null;
    if (icon instanceof File && icon.size > 0) {
      setBusy(true);
      try {
        const upload = new FormData(); upload.append("scope", "community"); upload.append("image", icon);
        const response = await fetch("/api/media", { method: "POST", body: upload });
        const result = await response.json() as { key?: string; error?: string };
        if (!response.ok || !result.key) throw new Error(result.error || "Community flag could not upload.");
        iconKey = result.key;
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Community flag could not upload.");
        return;
      } finally { setBusy(false); }
    }
    const done = await act({ action: "create-community", name: form.get("name"), motto: form.get("motto"), privacy: form.get("privacy"), iconKey });
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
  const hasCrew = mine.length > 0;
  const xp = state?.viewer.xp ?? 0;
  const openCallout = (communityId = mine[0]?.id ?? "") => {
    setSelectedCrew(communityId);
    setCalloutOpen(true);
  };
  const openCrewBuilder = () => {
    if (hasCrew) { announce(`You are already with ${mine[0].name}. Leave that crew before building a new one.`); return; }
    setCreateOpen(true);
  };

  if (!arenaOpen) return <main className="launch-page" ref={root}>
    <header className="launch-nav"><a className="brand" href="#top" aria-label="Com-Munitiez home"><BrandLockup /></a><div className="launch-nav-links"><a href="#how-it-works">How it works</a><a href="#season">Season 01</a><button className="launch-login" onClick={() => setArenaOpen(true)}>Log in</button></div></header>
    <section className="launch-hero" id="top">
      <div className="launch-copy">
        <p className="season-chip"><span /> Season 01 · Crews are forming</p>
        <h1>Find your people.<br /><em>Run the board.</em></h1>
        <p>Com-Munitiez turns meme coin conviction into a team sport. Build a crew, make calls together, stack reputation, and take the weekly pot.</p>
        <div className="launch-actions"><button className="launch-primary" onClick={() => setArenaOpen(true)}>Enter the arena <span>↗</span></button><button className="launch-text" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>See how crews win</button></div>
        <div className="launch-proof"><span><b>50</b> max members</span><span><b>100</b> point crew score</span><span><b>0</b> solo winners</span></div>
      </div>
      <div className="launch-board" aria-label="Current season standings">
        <div className="board-topline"><span>Live season board</span><b>Week 03 / 12</b></div>
        <div className="board-score"><span>Prize pool</span><strong>18,400 <small>PTS</small></strong><p>Rewarded to the entire winning crew.</p></div>
        <div className="launch-rankings"><article><i>01</i><b>BRK</b><div><strong>Breakout Club</strong><span>+47.2% weekly PNL</span></div><em>94</em></article><article><i>02</i><b>FROG</b><div><strong>Frog Assembly</strong><span>+38.8% weekly PNL</span></div><em>89</em></article><article><i>03</i><b>ARC</b><div><strong>Arcade Holdings</strong><span>+31.4% weekly PNL</span></div><em>84</em></article></div>
        <div className="board-footer"><span>Integrity checks live</span><span>•</span><span>156 active crews</span></div>
      </div>
      <div className="launch-sticker sticker-one">NO SOLO<br />FARMING</div><div className="launch-sticker sticker-two">HOLD<br />TO WIN</div>
    </section>
    <section className="launch-ticker"><div><span>CALLS ARE TEAM SPORTS</span><b>✦</b><span>BUILD A FLAG</span><b>✦</b><span>OWN YOUR REPUTATION</span><b>✦</b><span>CALLS ARE TEAM SPORTS</span><b>✦</b><span>BUILD A FLAG</span><b>✦</b><span>OWN YOUR REPUTATION</span></div></section>
    <section className="launch-rules" id="how-it-works"><p className="kicker">The crew loop</p><h2>One call is noise.<br />A crew is a signal.</h2><div><article><span>01</span><h3>Fly a flag</h3><p>Join a public crew or build a culture of your own. Every crew gets 50 seats.</p></article><article><span>02</span><h3>Earn receipts</h3><p>Hold time, call quality, integrity, and growth form the score everyone shares.</p></article><article><span>03</span><h3>Take the week</h3><p>Compete in weekly battles. Higher PNL and healthier behavior win the pool.</p></article></div></section>
    <section className="launch-bottom" id="season"><p className="kicker">Season 01 is live</p><h2>Your crew name should mean something.</h2><button className="launch-primary" onClick={() => setArenaOpen(true)}>Choose your side <span>↗</span></button></section>
  </main>;

  return <main className="pocket-app" ref={root}>
    <header className="nav-shell"><a className="brand" href="#top" aria-label="Com-Munitiez home"><BrandLockup /></a><nav aria-label="Main navigation"><Link href="/communities">Explore communities</Link><Link href="/profile">Profile</Link><Link href="/battles">Battles</Link></nav><div className="nav-actions"><Link className="profile-button" href="/profile">{state?.viewer.avatarKey ? <img className="nav-avatar" src={mediaUrl(state.viewer.avatarKey)} alt="" /> : state ? initials(state.viewer.displayName) : "--"}<span>{state?.viewer.displayName ?? "Loading"}</span></Link>{hasCrew && leaderCrew ? <Link className="nav-cta" href={`/community/${leaderCrew.id}`}>Your crew</Link> : <button className="nav-cta" onClick={openCrewBuilder}>Start a crew</button>}</div></header>
    <section className="arena-hud" aria-label="Your current season status"><div className="hud-season"><span className="live-dot" /> <b>Season 01</b><small>Week 03 · 4d 08h left</small></div><div className="hud-stats"><span><small>Your level</small><b>{state ? levelFor(xp) : "—"}</b></span><span><small>Crew rank</small><b>{leaderCrew ? "#18" : "—"}</b></span><span><small>XP today</small><b>+{state ? Math.min(45, 12 + state.completedChallengeIds.length * 8) : "—"}</b></span></div><button className="hud-action" onClick={() => openCallout()} disabled={!mine.length}>+ Drop a call</button></section>

    <section className="hero" id="top"><div className="hero-copy-wrap"><p className="kicker">Your season starts here</p><h1>{state ? <>Welcome back,<br /><em>{state.viewer.displayName.split(" ")[0]}.</em></> : <>Make the call.<br /><em>Keep the culture.</em></>}</h1><p className="hero-copy">{leaderCrew ? <>Your crew is on the board. Feed its score with calls that hold, members who show up, and a culture people want to rep.</> : <>Pick a side or fly your own flag. Every move from here adds to the reputation the whole community owns.</>}</p><div className="hero-actions">{leaderCrew ? <Link className="primary-button" href={`/community/${leaderCrew.id}`}>Open your crew</Link> : <Link className="primary-button" href="/communities">Explore communities</Link>}<button className="secondary-button" onClick={openCrewBuilder}>{hasCrew ? "One crew only" : "Build a crew"}</button></div></div><div className="hero-signal"><Image src="/brand/com-munitiez-banner-logo.png" alt="Com-Munitiez banner mark" fill priority sizes="(max-width: 900px) 88vw, 40vw" /><div className="signal-stamp"><span>Next payout</span><b>04D 08H</b><small>Top crews split the pot</small></div></div></section>

    <div className="marquee" aria-label="Com-Munitiez activity"><div className="marquee-track"><span>Verified hold time</span><b>•</b><span>Fifty people per crew</span><b>•</b><span>Weekly prize pools</span><b>•</b><span>Public reputation</span><b>•</b><span>Verified hold time</span><b>•</b><span>Fifty people per crew</span><b>•</b><span>Weekly prize pools</span><b>•</b><span>Public reputation</span><b>•</b></div></div>

    <section className="crew-section" id="crews"><div className="section-heading"><div><p className="kicker">Your crew station</p><h2>Make moves that<br />build the crew.</h2></div><div className="heading-actions"><button className="text-action" onClick={() => openCallout()} disabled={!mine.length}>Publish a callout</button><Link className="outline-button" href="/communities">Explore communities</Link></div></div>{error && <div className="error-banner" role="alert">{error}<button onClick={() => load().catch(() => undefined)}>Retry</button></div>}
      {!state && !error && <div className="loading-state" role="status">Loading Com-Munitiez...</div>}
      {state && <div className="bento-grid">
        <section className="bento bento-profile" id="member-profile"><div className="profile-top"><Link className="member-badge member-profile-link" href="/profile" aria-label="Open your profile">{state.viewer.avatarKey ? <img src={mediaUrl(state.viewer.avatarKey)} alt="" /> : initials(state.viewer.displayName)}</Link><div><p className="kicker">Member badge</p><h3>{state.viewer.displayName}</h3></div><span className="level">Level {levelFor(xp)}</span></div><p className="profile-copy">Show up for your crew, complete challenges, and earn a reputation members can trust.</p><div className="xp-row"><span>Community XP</span><b>{xp} / {levelFor(xp) * 250} XP</b></div><div className="xp-bar"><i style={{ width: `${Math.min(100, (xp % 250) / 2.5)}%` }} /></div><div className="profile-foot"><span><b>{mine.length}</b> crews</span><span><b>{state.viewer.referrals}</b> referrals</span><span><b>{state.completedChallengeIds.length}</b> challenges</span></div><Link className="profile-link" href="/profile">Open profile →</Link></section>
        <section className="bento bento-crew"><p className="kicker">Your active crew</p>{leaderCrew ? <><div className="crew-identity"><span className="crew-crest">{leaderCrew.iconKey ? <img src={mediaUrl(leaderCrew.iconKey)} alt="" /> : leaderCrew.tag}</span><div><h3>{leaderCrew.name}</h3><p>{leaderCrew.motto}</p></div><b className={`tier-chip ${leaderCrew.tier}`}>{leaderCrew.tier}</b></div><div className="crew-numbers"><span><b>{leaderCrew.memberCount}</b>/50 members</span><span><b>{leaderCrew.score || "Not rated"}</b>{leaderCrew.score ? "/100 score" : ""}</span><span><b>{leaderCrew.calloutCount}</b> calls</span></div><div className="crew-actions"><button className="dark-button" onClick={() => { setSelectedCrew(leaderCrew.id); setCalloutOpen(true); }}>Make a callout</button><button className="crew-leave-button" disabled={busy || leaderCrew.viewerRole === "leader"} title={leaderCrew.viewerRole === "leader" ? "Transfer leadership before leaving" : "Leave this crew"} onClick={() => void act({ action: "leave-community", communityId: leaderCrew.id })}>Leave crew</button></div></> : <><h3>No crew yet.</h3><p>Join a public crew or create the culture you want to be part of.</p><button className="dark-button" onClick={openCrewBuilder}>Start a crew</button></>}</section>
        <section className="bento bento-challenges"><div className="challenge-title"><div><p className="kicker">Build the culture</p><h3>Daily challenges</h3></div><span>{state.completedChallengeIds.length}/{state.challenges.length}</span></div><div className="challenge-list">{state.challenges.map((challenge) => { const done = state.completedChallengeIds.includes(challenge.id); return <article key={challenge.id}><div><b>{challenge.title}</b><p>{challenge.detail}</p></div><button disabled={done || busy} onClick={() => act({ action: "complete-challenge", communityId: mine[0]?.id ?? "challenge", challengeId: challenge.id })}>{done ? "Complete" : `+${challenge.xp} XP`}</button></article>; })}</div></section>
        <section className="bento bento-integrity"><div><p className="kicker">Built-in integrity</p><h3>Culture needs receipts.</h3><p>Every score takes hold duration, call quality, community growth, and manipulation checks into account.</p></div><div className="integrity-grid"><span>Wallet graph</span><b>Active</b><span>Bundle checks</span><b>Active</b><span>Hold receipts</span><b>Active</b></div></section>
      </div>}
    </section>
    <footer><a className="brand" href="#top"><BrandLockup /></a><span>Better together, on chain.</span><span>© 2026 Com-Munitiez</span></footer>

    {createOpen && <div className="modal-wrap" role="presentation"><form className="modal" onSubmit={createCommunity} aria-labelledby="create-title"><button type="button" className="close" aria-label="Close" onClick={() => setCreateOpen(false)}>Close</button><p className="kicker">Start a crew</p><h2 id="create-title">Give people a flag.</h2><p>Every community begins at Bronze tier. Publish its first callout to begin a public score.</p><label>Community name<input name="name" minLength={3} maxLength={28} required placeholder="The Real Ones" /></label><label>Culture line<input name="motto" minLength={4} maxLength={90} required placeholder="Why this crew exists" /></label><label>Community flag<input name="icon" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><small>Optional · JPG, PNG, WebP, or GIF · 2 MB max</small></label><fieldset><legend>Visibility</legend><label className="radio"><input type="radio" name="privacy" value="public" defaultChecked />Public <small>Anyone can join while there is room.</small></label><label className="radio"><input type="radio" name="privacy" value="private" />Private <small>Members request an invite to join.</small></label></fieldset><button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating..." : "Create community"}</button></form></div>}
    {calloutOpen && <div className="modal-wrap" role="presentation"><form className="modal" onSubmit={createCallout} aria-labelledby="callout-title"><button type="button" className="close" aria-label="Close" onClick={() => setCalloutOpen(false)}>Close</button><p className="kicker">Crew callout</p><h2 id="callout-title">Put it on the record.</h2><p>Callouts are community actions. They affect the crew’s score only after integrity and hold-time checks.</p><label>Community<select name="communityId" value={selectedCrew || mine[0]?.id || ""} onChange={(event) => setSelectedCrew(event.target.value)} required>{mine.map((community) => <option value={community.id} key={community.id}>{community.name}</option>)}</select></label><label>Ticker<input name="ticker" minLength={2} maxLength={12} required placeholder="MOGU" /></label><label>Thesis<textarea name="thesis" minLength={12} maxLength={280} required placeholder="What is the signal, and why is this worth the crew's attention?" /></label><button className="primary-button" type="submit" disabled={busy || !mine.length}>{busy ? "Publishing..." : "Publish callout"}</button></form></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
