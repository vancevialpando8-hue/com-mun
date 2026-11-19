import { getD1 } from "./index";
import {
  getBattleStateSupabase,
  getCommunityDetailSupabase,
  getPocketStateSupabase,
  getSupabaseAdmin,
  runPocketActionSupabase,
} from "./supabase-pocket";

export type Viewer = { id: string; displayName: string };

type CommunityStateRow = {
  id: string; name: string; tag: string; motto: string; privacy: string; memberCount: number;
  capacity: number; score: number; tier: string; weeklyPnl: string; integrityStatus: string;
  viewerRole: string | null; requested: number; calloutCount: number; iconKey: string | null;
};

const challenges = [
  { id: "introduce", title: "Make the introduction", detail: "Write a useful note in your community feed.", xp: 80 },
  { id: "receipt", title: "Read the receipts", detail: "Review an integrity report before joining a call.", xp: 120 },
  { id: "rally", title: "Rally the crew", detail: "Invite one verified member to your community.", xp: 160 },
];

let initialization: Promise<void> | undefined;

async function addColumnIfMissing(statement: string) {
  try { await getD1().prepare(statement).run(); } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name")) throw error;
  }
}

async function ensurePocketSchema() {
  if (initialization) return initialization;
  initialization = (async () => {
    const db = getD1();
    await db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 240, referrals INTEGER NOT NULL DEFAULT 0, wallet_address TEXT, wallet_pnl TEXT NOT NULL DEFAULT '0.0', avatar_key TEXT, member_status TEXT NOT NULL DEFAULT 'Scout', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS communities (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, tag TEXT NOT NULL, motto TEXT NOT NULL, privacy TEXT NOT NULL, owner_id TEXT NOT NULL, member_count INTEGER NOT NULL DEFAULT 1, capacity INTEGER NOT NULL DEFAULT 50, score INTEGER NOT NULL DEFAULT 0, tier TEXT NOT NULL DEFAULT 'bronze', icon_key TEXT, weekly_pnl TEXT NOT NULL DEFAULT '0.0', integrity_status TEXT NOT NULL DEFAULT '0 integrity flags', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS memberships (community_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'new_member', joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (community_id, user_id))"),
      db.prepare("CREATE TABLE IF NOT EXISTS join_requests (id TEXT PRIMARY KEY, community_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (community_id, user_id))"),
      db.prepare("CREATE TABLE IF NOT EXISTS callouts (id TEXT PRIMARY KEY, community_id TEXT NOT NULL, author_id TEXT NOT NULL, ticker TEXT NOT NULL, thesis TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS community_messages (id TEXT PRIMARY KEY, community_id TEXT NOT NULL, author_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS battles (id TEXT PRIMARY KEY, challenger_community_id TEXT NOT NULL, opponent_community_id TEXT NOT NULL, created_by TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', prize_points INTEGER NOT NULL DEFAULT 1200, ends_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      db.prepare("CREATE TABLE IF NOT EXISTS challenge_completions (challenge_id TEXT NOT NULL, user_id TEXT NOT NULL, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (challenge_id, user_id))"),
    ]);
    await addColumnIfMissing("ALTER TABLE profiles ADD COLUMN wallet_address TEXT");
    await addColumnIfMissing("ALTER TABLE profiles ADD COLUMN wallet_pnl TEXT NOT NULL DEFAULT '0.0'");
    await addColumnIfMissing("ALTER TABLE profiles ADD COLUMN avatar_key TEXT");
    await addColumnIfMissing("ALTER TABLE profiles ADD COLUMN member_status TEXT NOT NULL DEFAULT 'Scout'");
    await addColumnIfMissing("ALTER TABLE communities ADD COLUMN icon_key TEXT");
    await db.prepare("UPDATE communities SET tier = 'bronze' WHERE tier = 'rookie'").run();
    await db.batch([
      db.prepare("DELETE FROM memberships WHERE rowid NOT IN (SELECT rowid FROM memberships m WHERE rowid = (SELECT rowid FROM memberships candidate WHERE candidate.user_id = m.user_id ORDER BY CASE candidate.role WHEN 'leader' THEN 0 ELSE 1 END, candidate.joined_at ASC LIMIT 1))"),
      db.prepare("UPDATE communities SET member_count = (SELECT COUNT(*) FROM memberships WHERE community_id = communities.id)"),
      db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_id_unique ON memberships(user_id)"),
    ]);

    const existing = await db.prepare("SELECT COUNT(*) as count FROM communities").first<{ count: number }>();
    if ((existing?.count ?? 0) === 0) {
      await db.batch([
        db.prepare("INSERT INTO communities (id, name, tag, motto, privacy, owner_id, member_count, score, tier, weekly_pnl, integrity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("discipline-dept", "Discipline Dept.", "DD", "Stay boring. Win loudly.", "public", "system", 42, 96, "diamond", "38.2", "0 integrity flags"),
        db.prepare("INSERT INTO communities (id, name, tag, motto, privacy, owner_id, member_count, score, tier, weekly_pnl, integrity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("low-float-society", "Low Float Society", "LF", "Tiny caps, serious research.", "public", "system", 37, 91, "gold", "24.8", "1 watch item"),
        db.prepare("INSERT INTO communities (id, name, tag, motto, privacy, owner_id, member_count, score, tier, weekly_pnl, integrity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("terminally-bullish", "Terminally Bullish", "TB", "The group chat is the alpha.", "public", "system", 50, 86, "gold", "18.6", "At capacity"),
        db.prepare("INSERT INTO communities (id, name, tag, motto, privacy, owner_id, member_count, score, tier, weekly_pnl, integrity_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("midas-mode", "Midas Mode", "MM", "Private table. Shared upside.", "private", "system", 26, 79, "silver", "11.7", "Invite approval"),
      ]);
    }
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO profiles (id, display_name, xp, member_status) VALUES ('seed:nova', 'Nova Reed', 1280, 'Vanguard')"),
      db.prepare("INSERT OR IGNORE INTO profiles (id, display_name, xp, member_status) VALUES ('seed:ark', 'Ark D.', 920, 'Elder')"),
      db.prepare("INSERT OR IGNORE INTO profiles (id, display_name, xp, member_status) VALUES ('seed:sage', 'Sage Motion', 610, 'Member')"),
      db.prepare("INSERT OR IGNORE INTO profiles (id, display_name, xp, member_status) VALUES ('seed:rio', 'Rio Zero', 430, 'Scout')"),
      db.prepare("INSERT OR IGNORE INTO memberships (community_id, user_id, role) VALUES ('discipline-dept', 'seed:nova', 'leader')"),
      db.prepare("INSERT OR IGNORE INTO memberships (community_id, user_id, role) VALUES ('discipline-dept', 'seed:ark', 'elder')"),
      db.prepare("INSERT OR IGNORE INTO memberships (community_id, user_id, role) VALUES ('discipline-dept', 'seed:sage', 'new_member')"),
      db.prepare("INSERT OR IGNORE INTO memberships (community_id, user_id, role) VALUES ('low-float-society', 'seed:rio', 'leader')"),
      db.prepare("INSERT OR IGNORE INTO community_messages (id, community_id, author_id, body) VALUES ('seed:dd-1', 'discipline-dept', 'seed:nova', 'Morning check: thesis first, entries second. Drop your receipts before you add risk.')"),
      db.prepare("INSERT OR IGNORE INTO community_messages (id, community_id, author_id, body) VALUES ('seed:dd-2', 'discipline-dept', 'seed:ark', 'Week battle is close. Hold the line and keep every update useful.')"),
      db.prepare("INSERT OR IGNORE INTO battles (id, challenger_community_id, opponent_community_id, created_by, status, prize_points, ends_at) VALUES ('seed:dd-v-lf', 'discipline-dept', 'low-float-society', 'seed:nova', 'active', 18400, '2026-11-24T00:00:00.000Z')"),
    ]);
  })();
  return initialization;
}

async function ensureViewer(viewer: Viewer) {
  await getD1().prepare("INSERT INTO profiles (id, display_name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name").bind(viewer.id, viewer.displayName).run();
}

async function getPocketStateD1(viewer: Viewer) {
  await ensurePocketSchema(); await ensureViewer(viewer);
  const db = getD1();
  const [profile, communityResult, calloutResult, personalCalloutResult, completionResult] = await Promise.all([
    db.prepare("SELECT id, display_name as displayName, xp, referrals, wallet_address as walletAddress, wallet_pnl as walletPnl, avatar_key as avatarKey, member_status as memberStatus FROM profiles WHERE id = ?").bind(viewer.id).first(),
    db.prepare(`SELECT c.id, c.name, c.tag, c.motto, c.privacy, c.member_count as memberCount, c.capacity, c.score, c.tier, c.icon_key as iconKey, c.weekly_pnl as weeklyPnl, c.integrity_status as integrityStatus, m.role as viewerRole, EXISTS(SELECT 1 FROM join_requests r WHERE r.community_id = c.id AND r.user_id = ?) as requested, (SELECT COUNT(*) FROM callouts co WHERE co.community_id = c.id) as calloutCount FROM communities c LEFT JOIN memberships m ON m.community_id = c.id AND m.user_id = ? ORDER BY c.score DESC, c.created_at DESC`).bind(viewer.id, viewer.id).all<CommunityStateRow>(),
    db.prepare("SELECT co.id, co.ticker, co.thesis, co.created_at as createdAt, c.name as communityName, c.tag as communityTag, p.display_name as authorName FROM callouts co JOIN communities c ON c.id = co.community_id JOIN profiles p ON p.id = co.author_id ORDER BY co.created_at DESC LIMIT 8").all(),
    db.prepare("SELECT co.id, co.ticker, co.thesis, co.created_at as createdAt, c.name as communityName, p.display_name as authorName FROM callouts co JOIN communities c ON c.id = co.community_id JOIN profiles p ON p.id = co.author_id WHERE co.author_id = ? ORDER BY co.created_at DESC LIMIT 12").bind(viewer.id).all(),
    db.prepare("SELECT challenge_id as id FROM challenge_completions WHERE user_id = ?").bind(viewer.id).all<{ id: string }>(),
  ]);
  return { viewer: profile ?? { id: viewer.id, displayName: viewer.displayName, xp: 240, referrals: 0, walletAddress: null, walletPnl: "0.0", avatarKey: null, memberStatus: "Scout" }, communities: communityResult.results, callouts: calloutResult.results, personalCallouts: personalCalloutResult.results, challenges, completedChallengeIds: completionResult.results.map((row) => row.id) };
}

async function getCommunityDetailD1(viewer: Viewer, communityId: string) {
  const state = await getPocketStateD1(viewer); const db = getD1();
  const community = state.communities.find((item) => item.id === communityId);
  if (!community) throw new Error("That community is no longer available.");
  const viewerCrew = state.communities.find((item) => item.viewerRole);
  const [members, messages, callouts] = await Promise.all([
    db.prepare("SELECT p.id, p.display_name as displayName, p.xp, p.member_status as memberStatus, m.role, m.joined_at as joinedAt FROM memberships m JOIN profiles p ON p.id = m.user_id WHERE m.community_id = ? ORDER BY CASE m.role WHEN 'leader' THEN 1 WHEN 'co_leader' THEN 2 WHEN 'elder' THEN 3 ELSE 4 END, p.xp DESC LIMIT 50").bind(communityId).all(),
    db.prepare("SELECT cm.id, cm.body, cm.created_at as createdAt, p.display_name as authorName, m.role as authorRole FROM community_messages cm JOIN profiles p ON p.id = cm.author_id LEFT JOIN memberships m ON m.community_id = cm.community_id AND m.user_id = cm.author_id WHERE cm.community_id = ? ORDER BY cm.created_at DESC LIMIT 30").bind(communityId).all(),
    db.prepare("SELECT co.id, co.ticker, co.thesis, co.created_at as createdAt, p.display_name as authorName FROM callouts co JOIN profiles p ON p.id = co.author_id WHERE co.community_id = ? ORDER BY co.created_at DESC LIMIT 12").bind(communityId).all(),
  ]);
  return { ...community, viewerCrew: viewerCrew ? { id: viewerCrew.id, name: viewerCrew.name } : null, members: members.results, messages: messages.results.reverse(), callouts: callouts.results, challenges };
}

async function getBattleStateD1(viewer: Viewer) {
  const state = await getPocketStateD1(viewer);
  const db = getD1();
  const battles = await db.prepare("SELECT b.id, b.status, b.prize_points as prizePoints, b.ends_at as endsAt, b.created_at as createdAt, challenger.id as challengerId, challenger.name as challengerName, challenger.tag as challengerTag, challenger.weekly_pnl as challengerPnl, opponent.id as opponentId, opponent.name as opponentName, opponent.tag as opponentTag, opponent.weekly_pnl as opponentPnl FROM battles b JOIN communities challenger ON challenger.id = b.challenger_community_id JOIN communities opponent ON opponent.id = b.opponent_community_id WHERE b.status = 'active' ORDER BY b.created_at DESC LIMIT 20").all();
  const leaderboard = [...state.communities].sort((left, right) => Number(right.weeklyPnl) - Number(left.weeklyPnl)).map((community, index) => ({ ...community, rank: index + 1 }));
  const eligibleCommunities = state.communities.filter((community) => community.viewerRole === "leader" || community.viewerRole === "co_leader");
  return { leaderboard, battles: battles.results, eligibleCommunities, communities: state.communities };
}

function requireText(value: unknown, field: string, min: number, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length < min || result.length > max) throw new Error(`${field} must be between ${min} and ${max} characters.`);
  return result;
}
function tagFor(name: string) { return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase().padEnd(2, "P"); }
function mediaKey(value: unknown, prefix: "avatar" | "community") {
  const key = typeof value === "string" ? value : "";
  return key.startsWith(`${prefix}/`) && key.length <= 180 ? key : null;
}

async function runPocketActionD1(viewer: Viewer, payload: Record<string, unknown>) {
  await ensurePocketSchema(); await ensureViewer(viewer); const db = getD1(); const action = payload.action;
  if (action === "create-community") {
    const existingMembership = await db.prepare("SELECT c.name FROM memberships m JOIN communities c ON c.id = m.community_id WHERE m.user_id = ? LIMIT 1").bind(viewer.id).first<{ name: string }>();
    if (existingMembership) throw new Error(`Leave ${existingMembership.name} before creating a new crew.`);
    const name = requireText(payload.name, "Community name", 3, 28); const motto = requireText(payload.motto ?? "Your shared edge starts here.", "Culture line", 4, 90); const privacy = payload.privacy === "private" ? "private" : "public"; const iconKey = mediaKey(payload.iconKey, "community"); const id = crypto.randomUUID();
    await db.batch([db.prepare("INSERT INTO communities (id, name, tag, motto, privacy, owner_id, member_count, score, tier, icon_key, weekly_pnl, integrity_status) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'bronze', ?, '0.0', 'First callout starts your score')").bind(id, name, tagFor(name), motto, privacy, viewer.id, iconKey), db.prepare("INSERT INTO memberships (community_id, user_id, role) VALUES (?, ?, 'leader')").bind(id, viewer.id)]);
    return { message: `${name} is live. Publish its first callout to begin its score.` };
  }
  if (action === "complete-challenge") {
    const challengeId = requireText(payload.challengeId, "Challenge", 1, 40); const challenge = challenges.find((item) => item.id === challengeId); if (!challenge) throw new Error("That challenge does not exist.");
    const result = await db.prepare("INSERT OR IGNORE INTO challenge_completions (challenge_id, user_id) VALUES (?, ?)").bind(challengeId, viewer.id).run(); if (!result.meta.changes) return { message: "You already completed that challenge." };
    await db.prepare("UPDATE profiles SET xp = xp + ? WHERE id = ?").bind(challenge.xp, viewer.id).run(); return { message: `Challenge complete. You earned ${challenge.xp} XP.` };
  }
  if (action === "save-wallet") {
    const walletAddress = requireText(payload.walletAddress, "Wallet address", 4, 120);
    await db.prepare("UPDATE profiles SET wallet_address = ? WHERE id = ?").bind(walletAddress, viewer.id).run();
    return { message: "Wallet address saved. Live wallet PnL needs a connected chain data source." };
  }
  if (action === "save-avatar") {
    const avatarKey = mediaKey(payload.avatarKey, "avatar");
    if (!avatarKey) throw new Error("Choose an image before saving your avatar.");
    await db.prepare("UPDATE profiles SET avatar_key = ? WHERE id = ?").bind(avatarKey, viewer.id).run();
    return { message: "Profile photo saved." };
  }
  if (action === "start-battle") {
    const challengerCommunityId = requireText(payload.challengerCommunityId, "Your community", 1, 100);
    const opponentCommunityId = requireText(payload.opponentCommunityId, "Opponent community", 1, 100);
    if (challengerCommunityId === opponentCommunityId) throw new Error("Choose another community to start a battle.");
    const membership = await db.prepare("SELECT role FROM memberships WHERE community_id = ? AND user_id = ?").bind(challengerCommunityId, viewer.id).first<{ role: string }>();
    if (!membership || (membership.role !== "leader" && membership.role !== "co_leader")) throw new Error("Only community leaders can start a battle.");
    const [challenger, opponent, existingBattle] = await Promise.all([
      db.prepare("SELECT id, name FROM communities WHERE id = ?").bind(challengerCommunityId).first<{ id: string; name: string }>(),
      db.prepare("SELECT id, name FROM communities WHERE id = ?").bind(opponentCommunityId).first<{ id: string; name: string }>(),
      db.prepare("SELECT id FROM battles WHERE status = 'active' AND ((challenger_community_id = ? AND opponent_community_id = ?) OR (challenger_community_id = ? AND opponent_community_id = ?))").bind(challengerCommunityId, opponentCommunityId, opponentCommunityId, challengerCommunityId).first(),
    ]);
    if (!challenger || !opponent) throw new Error("One of those communities is no longer available.");
    if (existingBattle) throw new Error("Those communities already have an active battle.");
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare("INSERT INTO battles (id, challenger_community_id, opponent_community_id, created_by, status, prize_points, ends_at) VALUES (?, ?, ?, ?, 'active', 1200, ?)").bind(crypto.randomUUID(), challengerCommunityId, opponentCommunityId, viewer.id, endsAt).run();
    return { message: `${challenger.name} is now battling ${opponent.name}. The seven-day scoreboard is live.` };
  }
  const communityId = requireText(payload.communityId, "Community", 1, 100);
  const community = await db.prepare("SELECT id, name, privacy, member_count as memberCount, capacity, owner_id as ownerId FROM communities WHERE id = ?").bind(communityId).first<{ id: string; name: string; privacy: string; memberCount: number; capacity: number; ownerId: string }>();
  if (!community) throw new Error("That community is no longer available.");
  if (action === "join-community") {
    const member = await db.prepare("SELECT role FROM memberships WHERE community_id = ? AND user_id = ?").bind(communityId, viewer.id).first(); if (member) return { message: `You are already part of ${community.name}.` };
    const existingMembership = await db.prepare("SELECT c.name FROM memberships m JOIN communities c ON c.id = m.community_id WHERE m.user_id = ? LIMIT 1").bind(viewer.id).first<{ name: string }>();
    if (existingMembership) throw new Error(`You are already in ${existingMembership.name}. Leave that crew before joining another one.`);
    if (community.privacy === "private") { await db.prepare("INSERT OR IGNORE INTO join_requests (id, community_id, user_id) VALUES (?, ?, ?)").bind(crypto.randomUUID(), communityId, viewer.id).run(); return { message: `Your request is waiting for ${community.name}.` }; }
    const update = await db.prepare("UPDATE communities SET member_count = member_count + 1 WHERE id = ? AND member_count < capacity").bind(communityId).run(); if (!update.meta.changes) throw new Error(`${community.name} is at capacity.`);
    await db.prepare("INSERT INTO memberships (community_id, user_id, role) VALUES (?, ?, 'new_member')").bind(communityId, viewer.id).run(); return { message: `You joined ${community.name}. Your New Member badge is live.` };
  }
  if (action === "leave-community") {
    const membership = await db.prepare("SELECT role FROM memberships WHERE community_id = ? AND user_id = ?").bind(communityId, viewer.id).first<{ role: string }>(); if (!membership) throw new Error("You are not part of that community."); if (membership.role === "leader") throw new Error("Leaders cannot leave their community. Transfer leadership first.");
    await db.batch([db.prepare("DELETE FROM memberships WHERE community_id = ? AND user_id = ?").bind(communityId, viewer.id), db.prepare("UPDATE communities SET member_count = MAX(member_count - 1, 1) WHERE id = ?").bind(communityId)]); return { message: `You left ${community.name}.` };
  }
  if (action === "create-callout") {
    const membership = await db.prepare("SELECT role FROM memberships WHERE community_id = ? AND user_id = ?").bind(communityId, viewer.id).first(); if (!membership) throw new Error("Join the community before posting a callout.");
    const ticker = requireText(payload.ticker, "Ticker", 2, 12).replace(/^\$/, "").toUpperCase(); if (!/^[A-Z0-9]+$/.test(ticker)) throw new Error("Ticker can only use letters and numbers."); const thesis = requireText(payload.thesis, "Callout", 12, 280);
    await db.batch([db.prepare("INSERT INTO callouts (id, community_id, author_id, ticker, thesis) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), communityId, viewer.id, `$${ticker}`, thesis), db.prepare("UPDATE communities SET score = CASE WHEN score = 0 THEN 62 ELSE MIN(score + 1, 99) END, tier = CASE WHEN score = 0 THEN 'bronze' ELSE tier END, integrity_status = CASE WHEN score = 0 THEN '0 integrity flags' ELSE integrity_status END WHERE id = ?").bind(communityId)]); return { message: `$${ticker} is live. The community score has been updated.` };
  }
  if (action === "send-message") {
    const membership = await db.prepare("SELECT role FROM memberships WHERE community_id = ? AND user_id = ?").bind(communityId, viewer.id).first(); if (!membership) throw new Error("Join the community before posting in the room.");
    const body = requireText(payload.body, "Message", 1, 500); await db.prepare("INSERT INTO community_messages (id, community_id, author_id, body) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), communityId, viewer.id, body).run(); return { message: "Message posted to the community room." };
  }
  throw new Error("Unknown Pocket action.");
}

export async function getPocketState(viewer: Viewer) {
  return getSupabaseAdmin() ? getPocketStateSupabase(viewer) : getPocketStateD1(viewer);
}

export async function getCommunityDetail(viewer: Viewer, communityId: string) {
  return getSupabaseAdmin() ? getCommunityDetailSupabase(viewer, communityId) : getCommunityDetailD1(viewer, communityId);
}

export async function getBattleState(viewer: Viewer) {
  return getSupabaseAdmin() ? getBattleStateSupabase(viewer) : getBattleStateD1(viewer);
}

export async function runPocketAction(viewer: Viewer, payload: Record<string, unknown>) {
  return getSupabaseAdmin() ? runPocketActionSupabase(viewer, payload) : runPocketActionD1(viewer, payload);
}
