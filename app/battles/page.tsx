"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLockup } from "../components/brand-lockup";

type Community = { id: string; name: string; tag: string; score: number; tier: string; weeklyPnl: string; memberCount: number; calloutCount: number; viewerRole: string | null; integrityStatus: string; rank?: number };
type Battle = { id: string; status: string; prizePoints: number; endsAt: string; challengerId: string; challengerName: string; challengerTag: string; challengerPnl: string; opponentId: string; opponentName: string; opponentTag: string; opponentPnl: string };
type BattleState = { leaderboard: Community[]; battles: Battle[]; eligibleCommunities: Community[]; communities: Community[] };
type Payload = { state: unknown; battles: BattleState };

const progress = (pnl: string) => Math.max(8, Math.min(100, Number(pnl) * 2));
const ends = (date: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));

export default function BattlesPage() {
  const [data, setData] = useState<BattleState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/pocket?battles=1", { cache: "no-store" });
    const payload = await response.json() as Payload & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Battles could not load.");
    setData(payload.battles);
  };

  useEffect(() => {
    let active = true;
    void fetch("/api/pocket?battles=1", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as Payload & { error?: string } }))
      .then(({ response, payload }) => { if (!response.ok) throw new Error(payload.error || "Battles could not load."); if (active) setData(payload.battles); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Battles could not load."); });
    return () => { active = false; };
  }, []);

  async function startBattle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pocket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start-battle", challengerCommunityId: form.get("challengerCommunityId"), opponentCommunityId: form.get("opponentCommunityId") }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Battle could not start.");
      setNotice(result.message || "Battle started."); await load();
    } catch (battleError) { setError(battleError instanceof Error ? battleError.message : "Battle could not start."); }
    finally { setBusy(false); }
  }

  if (!data && !error) return <main className="detail-page"><p className="detail-loading">Loading the battle board…</p></main>;
  if (!data) return <main className="detail-page"><Link className="back-link" href="/profile">← Your profile</Link><div className="empty-panel"><h1>Battle board unavailable.</h1><p>{error}</p><button onClick={() => void load().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not reload."))}>Try again</button></div></main>;

  return <main className="detail-page battles-page">
    <header className="detail-nav"><Link className="brand" href="/"><BrandLockup /></Link><nav><Link href="/communities">Explore communities</Link><Link href="/profile">My profile</Link></nav></header>
    <section className="battle-page-hero"><div><Link className="back-link" href="/profile">← Your profile</Link><p className="kicker">Weekly community arena</p><h1>Win the week.<br /><em>Bring your whole crew.</em></h1><p>Battle boards rank communities on collective weekly PnL. Leaders can start a seven-day faceoff, then rally their members around one shared result.</p></div><div className="battle-seal"><span>LIVE</span><b>VS</b><i>collective<br />conviction</i></div></section>
    {error && <div className="error-banner room-error" role="alert">{error}</div>}
    <section className="battle-page-grid">
      <section className="battle-leaderboard"><div className="panel-heading"><div><p className="kicker">Leaderboard</p><h2>Top communities</h2></div><span>This week</span></div><div className="leaderboard-list">{data.leaderboard.map((community) => <article key={community.id}><strong>0{community.rank}</strong><span className="board-crest">{community.tag}</span><div><Link href={`/community/${community.id}`}><b>{community.name}</b></Link><small>{community.memberCount}/50 members · score {community.score || "unrated"} · {community.integrityStatus}</small></div><em className={Number(community.weeklyPnl) >= 0 ? "gain" : "loss"}>{Number(community.weeklyPnl) >= 0 ? "+" : ""}{community.weeklyPnl}%</em></article>)}</div></section>
      <aside className="battle-start-panel"><p className="kicker">Challenge another crew</p><h2>Start a battle.</h2><p>Leadership starts the matchup. Weekly verified performance determines the winner.</p>{data.eligibleCommunities.length ? <form onSubmit={startBattle}><label htmlFor="challengerCommunityId">Your community</label><select id="challengerCommunityId" name="challengerCommunityId" defaultValue={data.eligibleCommunities[0]?.id}><option value="" disabled>Select your community</option>{data.eligibleCommunities.map((community) => <option value={community.id} key={community.id}>{community.name} · {community.viewerRole?.replace("_", " ")}</option>)}</select><label htmlFor="opponentCommunityId">Challenge</label><select id="opponentCommunityId" name="opponentCommunityId" required defaultValue=""><option value="" disabled>Select a community</option>{data.communities.map((community) => <option value={community.id} key={community.id}>{community.name} · score {community.score || "unrated"}</option>)}</select><button className="primary-button" disabled={busy} type="submit">{busy ? "Starting…" : "Start 7-day battle"}</button></form> : <div className="battle-lock"><b>Connect a wallet to represent a community.</b><p>Browse the arena freely, then connect a public wallet from your profile to join or start a crew.</p><Link href="/profile">Connect wallet →</Link></div>}</aside>
    </section>
    <section className="active-battles"><div className="section-heading"><div><p className="kicker">Active faceoffs</p><h2>These crews are on the clock.</h2></div><span>{data.battles.length} live</span></div><div className="battle-match-list">{data.battles.length ? data.battles.map((battle) => { const leftWins = Number(battle.challengerPnl) >= Number(battle.opponentPnl); return <article key={battle.id}><div className="match-community"><span>{battle.challengerTag}</span><b>{battle.challengerName}</b><strong className={leftWins ? "gain" : ""}>{Number(battle.challengerPnl) >= 0 ? "+" : ""}{battle.challengerPnl}%</strong><i><i style={{ width: `${progress(battle.challengerPnl)}%` }} /></i></div><div className="match-middle"><b>VS</b><small>ends {ends(battle.endsAt)}</small><em>{battle.prizePoints.toLocaleString()} PTS</em></div><div className="match-community opponent"><span>{battle.opponentTag}</span><b>{battle.opponentName}</b><strong className={!leftWins ? "gain" : ""}>{Number(battle.opponentPnl) >= 0 ? "+" : ""}{battle.opponentPnl}%</strong><i><i style={{ width: `${progress(battle.opponentPnl)}%` }} /></i></div></article>; }) : <p className="empty-copy">No active battles yet. Set the first one in motion.</p>}</div></section>
    {notice && <div className="notice" role="status">{notice}</div>}
  </main>;
}
