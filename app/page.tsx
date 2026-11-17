"use client";

import { FormEvent, useMemo, useState } from "react";

type Community = {
  id: string;
  name: string;
  mark: string;
  motto: string;
  score: number;
  tier: "Diamond" | "Gold" | "Silver" | "Rookie";
  members: number;
  privacy: "Public" | "Private";
  weeklyPnl: string;
  status: string;
  color: string;
  leaders: string[];
};

const communityData: Community[] = [
  { id: "dept", name: "Discipline Dept.", mark: "DD", motto: "Stay boring. Win loudly.", score: 96, tier: "Diamond", members: 42, privacy: "Public", weeklyPnl: "+38.2%", status: "0 integrity flags", color: "acid", leaders: ["N", "K", "A"] },
  { id: "float", name: "Low Float Society", mark: "LF", motto: "Tiny caps, serious research.", score: 91, tier: "Gold", members: 37, privacy: "Public", weeklyPnl: "+24.8%", status: "1 watch item", color: "peach", leaders: ["L", "F", "S"] },
  { id: "terminal", name: "Terminally Bullish", mark: "TB", motto: "The group chat is the alpha.", score: 86, tier: "Gold", members: 50, privacy: "Public", weeklyPnl: "+18.6%", status: "At capacity", color: "blue", leaders: ["T", "B", "P"] },
  { id: "midas", name: "Midas Mode", mark: "MM", motto: "Private table. Shared upside.", score: 79, tier: "Silver", members: 26, privacy: "Private", weeklyPnl: "+11.7%", status: "Invite approval", color: "orange", leaders: ["M", "I", "D"] },
];

const roles = [
  { name: "Leader", detail: "Starts calls & sets culture", unlock: "Create a community", color: "leader" },
  { name: "Co-leader", detail: "Keeps the crew moving", unlock: "Trusted by leader", color: "coleader" },
  { name: "Elder", detail: "Proven signal contributor", unlock: "Level 12", color: "elder" },
  { name: "Member", detail: "Shows up & builds the group", unlock: "Join a community", color: "member" },
];

export default function Home() {
  const [tab, setTab] = useState("Discover");
  const [filter, setFilter] = useState("All");
  const [joined, setJoined] = useState<string[]>(["dept"]);
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCommunity, setCreatedCommunity] = useState<Community | null>(null);

  const communities = useMemo(() => {
    const all = createdCommunity ? [createdCommunity, ...communityData] : communityData;
    return all.filter((community) => filter === "All" || community.privacy === filter);
  }, [createdCommunity, filter]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function joinCommunity(community: Community) {
    if (community.members >= 50 && !joined.includes(community.id)) {
      showToast(`${community.name} is full. Pick another crew or request an invite.`);
      return;
    }
    const isJoined = joined.includes(community.id);
    setJoined((current) => isJoined ? current.filter((id) => id !== community.id) : [...current, community.id]);
    showToast(isJoined ? `You left ${community.name}.` : `Welcome to ${community.name}. Your Member badge is live.`);
  }

  function createCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "Your Crew").trim();
    const privacy = String(form.get("privacy") || "Public") as "Public" | "Private";
    const newCommunity: Community = {
      id: `community-${Date.now()}`,
      name,
      mark: name.slice(0, 2).toUpperCase(),
      motto: "Your shared edge starts here.",
      score: 0,
      tier: "Rookie",
      members: 1,
      privacy,
      weeklyPnl: "—",
      status: "First callout starts your score",
      color: "acid",
      leaders: ["Y"],
    };
    setCreatedCommunity(newCommunity);
    setJoined((current) => [...current, newCommunity.id]);
    setCreateOpen(false);
    showToast(`${name} is live. Make your first callout to begin its score.`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pocket home"><span className="brand-mark"><i /><i /><i /></span><span>pocket</span></a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {["Discover", "My crew", "Battles"].map((item) => <button key={item} className={tab === item ? "nav-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </nav>
        <div className="header-actions"><button className="icon-button" aria-label="View notifications">◌<b /></button><button className="wallet-button" onClick={() => showToast("Wallet connection is ready to wire up.")}>Connect wallet <span>↗</span></button></div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">Community-first callouts</p>
        <h1>Find your people.<br /><em>Build your rep.</em></h1>
        <p className="hero-copy">Pocket turns callouts into communities with something to protect: a shared score, real rewards, and a reputation everyone can see.</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("communities")?.scrollIntoView({ behavior: "smooth" })}>Find a community <span>↘</span></button><button className="text-button hero-text" onClick={() => setCreateOpen(true)}>Start your own <span>→</span></button></div>
        <div className="hero-stats"><div><strong>50</strong><span>max per crew</span></div><div><strong>4</strong><span>member ranks</span></div><div><strong>$1.8m</strong><span>shared rewards</span></div></div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="orbit-node node-a" /><div className="orbit-node node-b" /><div className="orbit-node node-c" />
        <div className="hero-badge"><span className="crest">DD</span><div><b>Discipline Dept.</b><small>Diamond community</small></div><strong>96</strong></div>
      </section>

      <section className="trust-strip" aria-label="Community principles"><span><em>01</em> Your score begins at first callout</span><span><em>02</em> Every community tops out at 50</span><span><em>03</em> Rewards follow collective action</span></section>

      <section className="community-hub" id="communities">
        <div className="section-heading community-heading"><div><p className="eyebrow">The community directory</p><h2>Pick a flag to fly.</h2></div><button className="outline-button" onClick={() => setCreateOpen(true)}>+ Start a community</button></div>
        <div className="directory-controls"><div className="tabs" role="tablist" aria-label="Community directory"><button className="active" role="tab" aria-selected="true">For you</button><button role="tab">Highest scoring</button><button role="tab">New crews</button></div><div className="filter-row">{["All", "Public", "Private"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
        <div className="community-layout">
          <div className="community-list">
            {communities.map((community) => {
              const isJoined = joined.includes(community.id);
              const isFull = community.members >= 50;
              return <article className="community-card" key={community.id}>
                <div className={`community-mark ${community.color}`}>{community.mark}<span className="mark-star">✦</span></div>
                <div className="community-summary"><div className="name-row"><h3>{community.name}</h3><span className={`tier ${community.tier.toLowerCase()}`}>{community.tier}</span><span className="privacy">{community.privacy === "Private" ? "◐ Private" : "◉ Public"}</span></div><p>{community.motto}</p><div className="micro-meta"><span>{community.members}/50 members</span><i /> <span>{community.status}</span><i /> <span className="positive">{community.weeklyPnl} this week</span></div></div>
                <div className="community-score"><span>crew score</span><strong>{community.score || "—"}<small>{community.score ? "/100" : ""}</small></strong><div className="meter"><i style={{ width: `${community.score}%` }} /></div></div>
                <div className="community-action"><div className="avatar-stack" aria-label="Community leaders">{community.leaders.map((leader, index) => <span key={index}>{leader}</span>)}</div><button className={isJoined ? "joined" : "join"} onClick={() => joinCommunity(community)}>{isJoined ? "Joined ✓" : isFull ? "Full" : community.privacy === "Private" ? "Request invite" : "Join crew"}</button></div>
              </article>;
            })}
          </div>

          <aside className="side-stack">
            <section className="profile-card"><div className="profile-top"><span className="member-mark">VR</span><div><p className="eyebrow">Your member status</p><h2>Scout <span>Lvl 08</span></h2></div></div><p>Great crews notice the people who add signal, bring the right members, and show up for the work.</p><div className="progress-row"><span>Scout progress</span><b>680 / 1,000 XP</b></div><div className="progress"><i /></div><div className="member-stats"><span><b>06</b> calls joined</span><span><b>03</b> friends referred</span><span><b>82%</b> participation</span></div><button className="text-button full" onClick={() => showToast("Your member profile is ready to expand.")}>View member badge <span>→</span></button></section>
            <section className="integrity-card"><div className="integrity-top"><p className="eyebrow">Integrity layer</p><span className="live-pill">● Live</span></div><h2>Culture needs receipts.</h2><p>Pocket checks callouts for bundle behavior, linked wallets, and market manipulation before score can grow.</p><div className="integrity-points"><span>✓ Wallet graph check</span><span>✓ Concentration scan</span><span>✓ Hold-time receipts</span></div><button className="text-button full" onClick={() => showToast("Integrity explanations will live on every community profile.")}>How warnings work <span>→</span></button></section>
          </aside>
        </div>
      </section>

      <section className="battle-section" id="battles">
        <div className="battle-header"><div><p className="eyebrow">Pocket weekly battle · round 12</p><h2>The Sunday showdown.</h2><p>Community vs. community. Best verified PnL from active calls wins the pot and a permanent season mark.</p></div><div className="battle-clock"><span>Battle ends in</span><strong>02<span>d</span> 11<span>h</span> 24<span>m</span></strong></div></div>
        <div className="battle-board"><div className="battle-team leading"><div className="battle-team-head"><span className="rank">01</span><span className="team-crest acid">DD</span><div><strong>Discipline Dept.</strong><p>42 members · 6 active calls</p></div><b>+38.2%</b></div><div className="battle-bar"><i /></div></div><div className="battle-team"><div className="battle-team-head"><span className="rank">02</span><span className="team-crest peach">LF</span><div><strong>Low Float Society</strong><p>37 members · 4 active calls</p></div><b>+24.8%</b></div><div className="battle-bar"><i /></div></div><div className="battle-reward"><span>this week’s community pot</span><strong>18,400 <small>PTS</small></strong><p>+ Diamond banner for the winning crew</p></div></div>
      </section>

      <section className="roles-section"><div><p className="eyebrow">Progress together</p><h2>Every crew has a hierarchy.<br />Every role matters.</h2></div><div className="roles-grid">{roles.map((role) => <article className="role-card" key={role.name}><span className={`role-icon ${role.color}`}>✦</span><p className="eyebrow">{role.unlock}</p><h3>{role.name}</h3><p>{role.detail}</p></article>)}</div></section>
      <section className="method"><div><p className="eyebrow">How a crew earns its score</p><h2>Reputation is a group project.</h2></div><p>Hold time and call quality carry the most weight. Growth comes from bringing in members who stay active, finishing in-app challenges, and winning battles without tripping integrity warnings.</p><div className="score-parts"><span><b>38%</b> Hold duration</span><span><b>24%</b> Call quality</span><span><b>20%</b> Integrity</span><span><b>18%</b> Community growth</span></div></section>
      <footer><a className="brand" href="#top"><span className="brand-mark"><i /><i /><i /></span><span>pocket</span></a><p>Better together, on chain.</p><span>© 2026 Pocket Protocol</span></footer>

      {createOpen && <div className="modal-backdrop" role="presentation"><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="close-button" onClick={() => setCreateOpen(false)} aria-label="Close create community form">×</button><p className="eyebrow">Start a crew</p><h2 id="create-title">Give people a flag.</h2><p>Your community begins as Rookie tier. Its score appears after the first verified callout.</p><form onSubmit={createCommunity}><label htmlFor="community-name">Community name</label><input id="community-name" name="name" required maxLength={28} placeholder="e.g. The Real Ones" /><fieldset><legend>Visibility</legend><label className="choice"><input type="radio" name="privacy" value="Public" defaultChecked /><span><b>Public</b><small>Anyone can see and join if there’s space.</small></span></label><label className="choice"><input type="radio" name="privacy" value="Private" /><span><b>Private</b><small>Members request an invite to join.</small></span></label></fieldset><button className="primary-button create-submit" type="submit">Create community <span>↗</span></button></form></section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
