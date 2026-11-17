"use client";

import { useMemo, useState } from "react";

type Call = {
  ticker: string;
  name: string;
  vibe: string;
  change: string;
  changeType: "up" | "down";
  score: number;
  members: string;
  time: string;
  category: string;
  status: string;
  accent: string;
  avatar: string;
};

const calls: Call[] = [
  { ticker: "$MOGU", name: "Mogu Club", vibe: "Internet-native luxury for the deeply online.", change: "+184.2%", changeType: "up", score: 94, members: "1,284", time: "24m ago", category: "Culture", status: "Clean", accent: "mogu", avatar: "M" },
  { ticker: "$RIVET", name: "Rivet", vibe: "A tiny tool with a strangely serious cult following.", change: "+68.4%", changeType: "up", score: 88, members: "846", time: "58m ago", category: "Utility", status: "Clean", accent: "rivet", avatar: "R" },
  { ticker: "$SLOTH", name: "Slow Mode", vibe: "The anti-grind coin, moving at its own speed.", change: "+22.1%", changeType: "up", score: 81, members: "526", time: "1h ago", category: "Culture", status: "Watch", accent: "sloth", avatar: "S" },
  { ticker: "$PIP", name: "Pip", vibe: "A very small pup with a very loud timeline.", change: "-6.7%", changeType: "down", score: 73, members: "318", time: "2h ago", category: "Meme", status: "Watch", accent: "pip", avatar: "P" },
];

const communities = [
  { rank: "01", name: "Discipline Dept.", members: "2.4k", score: 96.8, delta: "+3.1", initials: "DD", accent: "lime" },
  { rank: "02", name: "Low Float Society", members: "1.7k", score: 93.2, delta: "+1.8", initials: "LF", accent: "orange" },
  { rank: "03", name: "Terminally Bullish", members: "3.1k", score: 91.6, delta: "+0.6", initials: "TB", accent: "blue" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("For you");
  const [filter, setFilter] = useState("All calls");
  const [joined, setJoined] = useState<string[]>(["$MOGU"]);
  const [toast, setToast] = useState("");

  const visibleCalls = useMemo(
    () => calls.filter((call) => filter === "All calls" || call.category === filter),
    [filter],
  );

  function toggleJoin(ticker: string) {
    const isJoined = joined.includes(ticker);
    setJoined((current) =>
      isJoined ? current.filter((item) => item !== ticker) : [...current, ticker],
    );
    setToast(isJoined ? `Left the ${ticker} collective.` : `You joined the ${ticker} collective.`);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Pocket home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>pocket</span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {["Discover", "Communities", "Scoreboard"].map((item) => <a href={`#${item.toLowerCase()}`} key={item}>{item}</a>)}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="View notifications">◌<b /></button>
          <button className="wallet-button" onClick={() => setToast("Wallet connection is ready to wire up.")}>Connect wallet <span>↗</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-noise" />
        <p className="eyebrow">Shared conviction, verifiable behavior</p>
        <h1>Better calls<br />are made together.</h1>
        <p className="hero-copy">Find the communities that do the work, stay in the trade, and share the upside. No solo tail farming.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>Explore calls <span>↘</span></button>
          <button className="text-button" onClick={() => setToast("The community score rewards conviction, not clout.")}>How scoring works <span>→</span></button>
        </div>
        <div className="hero-stats" aria-label="Platform statistics">
          <div><strong>$1.8m</strong><span>community rewards</span></div>
          <div><strong>18,402</strong><span>active holders</span></div>
          <div><strong>91.3</strong><span>avg. community score</span></div>
        </div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="orbit-node node-a" /><div className="orbit-node node-b" /><div className="orbit-node node-c" />
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <span><em>01</em> Hold behavior earns the score</span><span><em>02</em> Rewards flow to the collective</span><span><em>03</em> On-chain receipts, always</span>
      </section>

      <section className="dashboard-grid" id="discover">
        <div className="feed-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Live conviction feed</p><h2>Calls with company.</h2></div>
            <button className="outline-button" onClick={() => setToast("Call creation is coming next.")}>+ Make a call</button>
          </div>
          <div className="feed-controls">
            <div className="tabs" role="tablist" aria-label="Feed selection">
              {["For you", "Trending", "Following"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}>{tab}</button>)}
            </div>
            <div className="filter-row">{["All calls", "Culture", "Utility", "Meme"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
          </div>
          <div className="calls-list">
            {visibleCalls.map((call) => {
              const isJoined = joined.includes(call.ticker);
              return <article className="call-card" key={call.ticker}>
                <div className={`coin-avatar ${call.accent}`}>{call.avatar}</div>
                <div className="call-main"><div className="call-title"><h3>{call.ticker}</h3><span>{call.name}</span><span className={`verification ${call.status === "Clean" ? "clean" : "watch"}`}>{call.status === "Clean" ? "● Clean" : "◔ Watch"}</span></div><p>{call.vibe}</p><div className="call-meta"><span>by <b>coldbrew</b></span><span>·</span><span>{call.time}</span><span>·</span><span>{call.members} holding together</span></div></div>
                <div className="call-score"><span>community score</span><strong>{call.score}<small>/100</small></strong><div className="meter"><i style={{ width: `${call.score}%` }} /></div></div>
                <div className="call-action"><strong className={call.changeType}>{call.change}</strong><button className={isJoined ? "joined" : "join"} onClick={() => toggleJoin(call.ticker)}>{isJoined ? "Joined ✓" : "Join call"}</button></div>
              </article>;
            })}
          </div>
        </div>

        <aside className="right-rail">
          <section className="integrity-card">
            <div className="integrity-top"><p className="eyebrow">Integrity report</p><span className="live-pill">● Live</span></div>
            <h2>Creator graph check</h2><p>Every call is screened for linked wallets and suspicious bundles before it reaches the feed.</p>
            <div className="graph" aria-label="Creator wallet graph visualization"><span className="graph-core">●</span><i className="graph-line one"/><i className="graph-line two"/><i className="graph-line three"/><i className="graph-line four"/><b className="graph-dot one"/><b className="graph-dot two"/><b className="graph-dot three"/><b className="graph-dot four"/><b className="graph-dot five"/></div>
            <div className="integrity-result"><span className="integrity-icon">✓</span><div><strong>No coordinated bundle detected</strong><p>for $MOGU · refreshed 2m ago</p></div></div>
            <button className="text-button full" onClick={() => setToast("Full graph explorer will show wallet links and risk labels.")}>Open graph explorer <span>→</span></button>
          </section>

          <section className="community-card" id="communities">
            <div className="section-heading compact"><div><p className="eyebrow">Ranked by behavior</p><h2>Communities to watch</h2></div><button className="plain-link" onClick={() => setToast("Showing all communities soon.")}>See all</button></div>
            {communities.map((community) => <div className="community-row" key={community.rank}><span className="rank">{community.rank}</span><span className={`community-avatar ${community.accent}`}>{community.initials}</span><div><strong>{community.name}</strong><p>{community.members} members</p></div><div className="community-score"><strong>{community.score}</strong><span>{community.delta}</span></div></div>)}
          </section>
        </aside>
      </section>

      <section className="method" id="scoreboard">
        <div><p className="eyebrow">The pocket score</p><h2>Signal over noise.</h2></div>
        <p>A community earns reputation through collective actions: percentage held after the call, wallet concentration, creator integrity, and whether the group keeps showing up.</p>
        <div className="score-parts"><span><b>46%</b> Hold duration</span><span><b>24%</b> Distribution</span><span><b>18%</b> Creator integrity</span><span><b>12%</b> Call quality</span></div>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark"><i /><i /><i /></span><span>pocket</span></a><p>Built for the long-ish term.</p><span>© 2026 Pocket Protocol</span></footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
