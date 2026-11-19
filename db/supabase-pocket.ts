import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env as cloudflareEnv } from "cloudflare:workers";

export type Viewer = { id: string; displayName: string };

type CommunityRow = {
  id: string; name: string; tag: string; motto: string; privacy: string; owner_id: string;
  member_count: number; capacity: number; score: number; tier: string; weekly_pnl: string;
  integrity_status: string; icon_key: string | null; created_at: string;
};
type ProfileRow = { id: string; display_name: string; xp: number; referrals: number; wallet_address: string | null; wallet_pnl: string; avatar_key: string | null; member_status: string; };
type MembershipRow = { community_id: string; user_id: string; role: string; joined_at: string };
type CalloutRow = { id: string; community_id: string; author_id: string; ticker: string; thesis: string; created_at: string };
type MessageRow = { id: string; community_id: string; author_id: string; body: string; created_at: string };
type BattleRow = { id: string; challenger_community_id: string; opponent_community_id: string; created_by: string; status: string; prize_points: number; ends_at: string; created_at: string };

const challenges = [
  { id: "introduce", title: "Make the introduction", detail: "Write a useful note in your community feed.", xp: 80 },
  { id: "receipt", title: "Read the receipts", detail: "Review an integrity report before joining a call.", xp: 120 },
  { id: "rally", title: "Rally the crew", detail: "Invite one verified member to your community.", xp: 160 },
];

function envValue(name: string) {
  const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const processValue = processEnv?.[name];
  if (processValue) return processValue;
  const runtimeValue = (cloudflareEnv as unknown as Record<string, unknown>)[name];
  return typeof runtimeValue === "string" ? runtimeValue : undefined;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = envValue("SUPABASE_URL");
  const key = envValue("SUPABASE_SERVICE_ROLE_KEY") || envValue("SUPABASE_SECRET_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseAdmin());
}

function assertOk(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

async function ensureSchemaSeeded(client: SupabaseClient) {
  const { count, error } = await client.from("communities").select("id", { count: "exact", head: true });
  assertOk(error, "Supabase communities table is unavailable.");
  if ((count ?? 0) > 0) return;

  const communities = [
    { id: "discipline-dept", name: "Discipline Dept.", tag: "DD", motto: "Stay boring. Win loudly.", privacy: "public", owner_id: "system", member_count: 42, capacity: 50, score: 96, tier: "diamond", weekly_pnl: "38.2", integrity_status: "0 integrity flags" },
    { id: "low-float-society", name: "Low Float Society", tag: "LF", motto: "Tiny caps, serious research.", privacy: "public", owner_id: "system", member_count: 37, capacity: 50, score: 91, tier: "gold", weekly_pnl: "24.8", integrity_status: "1 watch item" },
    { id: "terminally-bullish", name: "Terminally Bullish", tag: "TB", motto: "The group chat is the alpha.", privacy: "public", owner_id: "system", member_count: 50, capacity: 50, score: 86, tier: "gold", weekly_pnl: "18.6", integrity_status: "At capacity" },
    { id: "midas-mode", name: "Midas Mode", tag: "MM", motto: "Private table. Shared upside.", privacy: "private", owner_id: "system", member_count: 26, capacity: 50, score: 79, tier: "silver", weekly_pnl: "11.7", integrity_status: "Invite approval" },
  ];
  assertOk((await client.from("communities").insert(communities)).error, "Unable to seed communities.");
  assertOk((await client.from("profiles").upsert([
    { id: "seed:nova", display_name: "Nova Reed", xp: 1280, member_status: "Vanguard" },
    { id: "seed:ark", display_name: "Ark D.", xp: 920, member_status: "Elder" },
    { id: "seed:sage", display_name: "Sage Motion", xp: 610, member_status: "Member" },
    { id: "seed:rio", display_name: "Rio Zero", xp: 430, member_status: "Scout" },
  ], { onConflict: "id" })).error, "Unable to seed profiles.");
  assertOk((await client.from("memberships").insert([
    { community_id: "discipline-dept", user_id: "seed:nova", role: "leader" },
    { community_id: "discipline-dept", user_id: "seed:ark", role: "elder" },
    { community_id: "discipline-dept", user_id: "seed:sage", role: "new_member" },
    { community_id: "low-float-society", user_id: "seed:rio", role: "leader" },
  ])).error, "Unable to seed memberships.");
  assertOk((await client.from("community_messages").insert([
    { id: "seed:dd-1", community_id: "discipline-dept", author_id: "seed:nova", body: "Morning check: thesis first, entries second. Drop your receipts before you add risk." },
    { id: "seed:dd-2", community_id: "discipline-dept", author_id: "seed:ark", body: "Week battle is close. Hold the line and keep every update useful." },
  ])).error, "Unable to seed messages.");
  assertOk((await client.from("battles").insert({ id: "seed:dd-v-lf", challenger_community_id: "discipline-dept", opponent_community_id: "low-float-society", created_by: "seed:nova", status: "active", prize_points: 18400, ends_at: "2026-11-24T00:00:00.000Z" })).error, "Unable to seed battles.");
}

async function ensureViewer(client: SupabaseClient, viewer: Viewer) {
  const { error } = await client.from("profiles").upsert({ id: viewer.id, display_name: viewer.displayName }, { onConflict: "id" });
  assertOk(error, "Unable to save your profile.");
  await ensureSchemaSeeded(client);
}

function profileShape(row: ProfileRow | null, viewer: Viewer) {
  return row ? {
    id: row.id, displayName: row.display_name, xp: row.xp, referrals: row.referrals,
    walletAddress: row.wallet_address, walletPnl: row.wallet_pnl, avatarKey: row.avatar_key, memberStatus: row.member_status,
  } : { id: viewer.id, displayName: viewer.displayName, xp: 240, referrals: 0, walletAddress: null, walletPnl: "0.0", avatarKey: null, memberStatus: "Scout" };
}

export async function getPocketStateSupabase(viewer: Viewer) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Railway.");
  await ensureViewer(client, viewer);
  const [profileResult, communitiesResult, membershipsResult, requestsResult, calloutsResult, completionsResult, profilesResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", viewer.id).maybeSingle(),
    client.from("communities").select("*").order("score", { ascending: false }).order("created_at", { ascending: false }),
    client.from("memberships").select("community_id,user_id,role,joined_at").eq("user_id", viewer.id),
    client.from("join_requests").select("community_id").eq("user_id", viewer.id),
    client.from("callouts").select("*").order("created_at", { ascending: false }),
    client.from("challenge_completions").select("challenge_id").eq("user_id", viewer.id),
    client.from("profiles").select("id,display_name"),
  ]);
  for (const result of [profileResult, communitiesResult, membershipsResult, requestsResult, calloutsResult, completionsResult, profilesResult]) assertOk(result.error, "Unable to load Com-Munitiez data.");
  const communities = (communitiesResult.data as CommunityRow[]).map((row) => {
    const membership = (membershipsResult.data as MembershipRow[]).find((item) => item.community_id === row.id);
    const requested = (requestsResult.data as { community_id: string }[]).some((item) => item.community_id === row.id);
    return { id: row.id, name: row.name, tag: row.tag, motto: row.motto, privacy: row.privacy, memberCount: row.member_count, capacity: row.capacity, score: row.score, tier: row.tier, weeklyPnl: row.weekly_pnl, integrityStatus: row.integrity_status, iconKey: row.icon_key, viewerRole: membership?.role ?? null, requested, calloutCount: (calloutsResult.data as CalloutRow[]).filter((callout) => callout.community_id === row.id).length };
  });
  const communityById = new Map(communities.map((community) => [community.id, community]));
  const profileById = new Map((profilesResult.data as Pick<ProfileRow, "id" | "display_name">[]).map((profile) => [profile.id, profile.display_name]));
  const formatCallout = (row: CalloutRow) => ({ id: row.id, ticker: row.ticker, thesis: row.thesis, createdAt: row.created_at, communityName: communityById.get(row.community_id)?.name ?? "Community", communityTag: communityById.get(row.community_id)?.tag ?? "??", authorName: profileById.get(row.author_id) ?? "Crew member" });
  const callouts = (calloutsResult.data as CalloutRow[]).slice(0, 8).map(formatCallout);
  const personalCallouts = (calloutsResult.data as CalloutRow[]).filter((row) => row.author_id === viewer.id).slice(0, 12).map(formatCallout);
  return { viewer: profileShape(profileResult.data as ProfileRow | null, viewer), communities, callouts, personalCallouts, challenges, completedChallengeIds: (completionsResult.data as { challenge_id: string }[]).map((row) => row.challenge_id) };
}

export async function getCommunityDetailSupabase(viewer: Viewer, communityId: string) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Railway.");
  const state = await getPocketStateSupabase(viewer);
  const community = state.communities.find((item) => item.id === communityId);
  if (!community) throw new Error("That community is no longer available.");
  const viewerCrew = state.communities.find((item) => item.viewerRole);
  const [membersResult, messagesResult, calloutsResult, profilesResult, membershipsResult] = await Promise.all([
    client.from("memberships").select("*").eq("community_id", communityId).order("joined_at", { ascending: true }),
    client.from("community_messages").select("*").eq("community_id", communityId).order("created_at", { ascending: false }).limit(30),
    client.from("callouts").select("*").eq("community_id", communityId).order("created_at", { ascending: false }).limit(12),
    client.from("profiles").select("*"),
    client.from("memberships").select("community_id,user_id,role").eq("community_id", communityId),
  ]);
  for (const result of [membersResult, messagesResult, calloutsResult, profilesResult, membershipsResult]) assertOk(result.error, "Unable to load the community room.");
  const profiles = new Map((profilesResult.data as ProfileRow[]).map((profile) => [profile.id, profile]));
  const roles = new Map((membershipsResult.data as MembershipRow[]).map((membership) => [membership.user_id, membership.role]));
  const members = (membersResult.data as MembershipRow[]).map((membership) => { const profile = profiles.get(membership.user_id); return { id: membership.user_id, displayName: profile?.display_name ?? "Crew member", xp: profile?.xp ?? 0, memberStatus: profile?.member_status ?? "Scout", role: membership.role, joinedAt: membership.joined_at }; }).sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : b.xp - a.xp));
  const messages = (messagesResult.data as MessageRow[]).map((message) => ({ id: message.id, body: message.body, createdAt: message.created_at, authorName: profiles.get(message.author_id)?.display_name ?? "Crew member", authorRole: roles.get(message.author_id) ?? null })).reverse();
  const callouts = (calloutsResult.data as CalloutRow[]).map((callout) => ({ id: callout.id, ticker: callout.ticker, thesis: callout.thesis, createdAt: callout.created_at, authorName: profiles.get(callout.author_id)?.display_name ?? "Crew member" }));
  return { ...community, viewerCrew: viewerCrew ? { id: viewerCrew.id, name: viewerCrew.name } : null, members, messages, callouts, challenges };
}

export async function getBattleStateSupabase(viewer: Viewer) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Railway.");
  const state = await getPocketStateSupabase(viewer);
  const { data, error } = await client.from("battles").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(20);
  assertOk(error, "Unable to load the battle arena.");
  const communities = new Map(state.communities.map((community) => [community.id, community]));
  const battles = (data as BattleRow[]).map((battle) => ({ id: battle.id, status: battle.status, prizePoints: battle.prize_points, endsAt: battle.ends_at, createdAt: battle.created_at, challengerId: battle.challenger_community_id, challengerName: communities.get(battle.challenger_community_id)?.name ?? "Community", challengerTag: communities.get(battle.challenger_community_id)?.tag ?? "??", challengerPnl: communities.get(battle.challenger_community_id)?.weeklyPnl ?? "0.0", opponentId: battle.opponent_community_id, opponentName: communities.get(battle.opponent_community_id)?.name ?? "Community", opponentTag: communities.get(battle.opponent_community_id)?.tag ?? "??", opponentPnl: communities.get(battle.opponent_community_id)?.weeklyPnl ?? "0.0" }));
  const leaderboard = [...state.communities].sort((left, right) => Number(right.weeklyPnl) - Number(left.weeklyPnl)).map((community, index) => ({ ...community, rank: index + 1 }));
  return { leaderboard, battles, eligibleCommunities: state.communities.filter((community) => community.viewerRole === "leader" || community.viewerRole === "co_leader"), communities: state.communities };
}

function requireText(value: unknown, field: string, min: number, max: number) { const result = typeof value === "string" ? value.trim() : ""; if (result.length < min || result.length > max) throw new Error(`${field} must be between ${min} and ${max} characters.`); return result; }
function tagFor(name: string) { return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase().padEnd(2, "P"); }
function mediaKey(value: unknown, prefix: "avatar" | "community") { const key = typeof value === "string" ? value : ""; return key.startsWith(`${prefix}/`) && key.length <= 180 ? key : null; }

export async function runPocketActionSupabase(viewer: Viewer, payload: Record<string, unknown>) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Railway.");
  await ensureViewer(client, viewer);
  const action = payload.action;
  if (action === "create-community") {
    const { data: existing } = await client.from("memberships").select("community_id,communities(name)").eq("user_id", viewer.id).maybeSingle();
    if (existing) throw new Error(`Leave your current crew before creating a new one.`);
    const name = requireText(payload.name, "Community name", 3, 28); const motto = requireText(payload.motto ?? "Your shared edge starts here.", "Culture line", 4, 90); const privacy = payload.privacy === "private" ? "private" : "public"; const iconKey = mediaKey(payload.iconKey, "community");
    const id = crypto.randomUUID();
    assertOk((await client.from("communities").insert({ id, name, tag: tagFor(name), motto, privacy, owner_id: viewer.id, member_count: 1, score: 0, tier: "bronze", icon_key: iconKey, weekly_pnl: "0.0", integrity_status: "First callout starts your score" })).error, "Unable to create the community.");
    assertOk((await client.from("memberships").insert({ community_id: id, user_id: viewer.id, role: "leader" })).error, "Unable to create the community membership.");
    return { message: `${name} is live. Publish its first callout to begin its score.` };
  }
  if (action === "complete-challenge") {
    const challengeId = requireText(payload.challengeId, "Challenge", 1, 40); const challenge = challenges.find((item) => item.id === challengeId); if (!challenge) throw new Error("That challenge does not exist.");
    const { error } = await client.from("challenge_completions").insert({ challenge_id: challengeId, user_id: viewer.id });
    if (error?.code === "23505") return { message: "You already completed that challenge." }; assertOk(error, "Unable to complete that challenge.");
    const profile = await client.from("profiles").select("xp").eq("id", viewer.id).single(); assertOk(profile.error, "Unable to update XP.");
    assertOk((await client.from("profiles").update({ xp: (profile.data?.xp ?? 240) + challenge.xp }).eq("id", viewer.id)).error, "Unable to update XP.");
    return { message: `Challenge complete. You earned ${challenge.xp} XP.` };
  }
  if (action === "save-wallet") { const walletAddress = requireText(payload.walletAddress, "Wallet address", 4, 120); assertOk((await client.from("profiles").update({ wallet_address: walletAddress }).eq("id", viewer.id)).error, "Unable to save your wallet."); return { message: "Wallet address saved. Live wallet PnL needs a connected chain data source." }; }
  if (action === "save-avatar") { const avatarKey = mediaKey(payload.avatarKey, "avatar"); if (!avatarKey) throw new Error("Choose an image before saving your avatar."); assertOk((await client.from("profiles").update({ avatar_key: avatarKey }).eq("id", viewer.id)).error, "Unable to save your profile photo."); return { message: "Profile photo saved." }; }
  if (action === "start-battle") {
    const challengerCommunityId = requireText(payload.challengerCommunityId, "Your community", 1, 100); const opponentCommunityId = requireText(payload.opponentCommunityId, "Opponent community", 1, 100); if (challengerCommunityId === opponentCommunityId) throw new Error("Choose another community to start a battle.");
    const membership = await client.from("memberships").select("role").eq("community_id", challengerCommunityId).eq("user_id", viewer.id).maybeSingle(); assertOk(membership.error, "Unable to verify your crew role."); if (!membership.data || !["leader", "co_leader"].includes(membership.data.role)) throw new Error("Only community leaders can start a battle.");
    const communitiesResult = await client.from("communities").select("id,name").in("id", [challengerCommunityId, opponentCommunityId]); assertOk(communitiesResult.error, "Unable to load the communities."); if ((communitiesResult.data ?? []).length !== 2) throw new Error("One of those communities is no longer available.");
    const active = await client.from("battles").select("id,challenger_community_id,opponent_community_id").eq("status", "active"); assertOk(active.error, "Unable to check active battles."); if ((active.data ?? []).some((battle) => (battle.challenger_community_id === challengerCommunityId && battle.opponent_community_id === opponentCommunityId) || (battle.challenger_community_id === opponentCommunityId && battle.opponent_community_id === challengerCommunityId))) throw new Error("Those communities already have an active battle.");
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); const challenger = communitiesResult.data?.find((item) => item.id === challengerCommunityId); const opponent = communitiesResult.data?.find((item) => item.id === opponentCommunityId);
    assertOk((await client.from("battles").insert({ id: crypto.randomUUID(), challenger_community_id: challengerCommunityId, opponent_community_id: opponentCommunityId, created_by: viewer.id, status: "active", prize_points: 1200, ends_at: endsAt })).error, "Unable to start the battle.");
    return { message: `${challenger?.name} is now battling ${opponent?.name}. The seven-day scoreboard is live.` };
  }
  const communityId = requireText(payload.communityId, "Community", 1, 100);
  const communityResult = await client.from("communities").select("id,name,privacy,member_count,capacity,owner_id").eq("id", communityId).maybeSingle(); assertOk(communityResult.error, "Unable to find that community."); const community = communityResult.data as { id: string; name: string; privacy: string; member_count: number; capacity: number; owner_id: string } | null; if (!community) throw new Error("That community is no longer available.");
  if (action === "join-community") {
    const member = await client.from("memberships").select("role").eq("community_id", communityId).eq("user_id", viewer.id).maybeSingle(); if (member.data) return { message: `You are already part of ${community.name}.` };
    const existing = await client.from("memberships").select("community_id").eq("user_id", viewer.id).maybeSingle(); if (existing.data) throw new Error("You are already in a crew. Leave it before joining another one.");
    if (community.privacy === "private") { const result = await client.from("join_requests").upsert({ id: crypto.randomUUID(), community_id: communityId, user_id: viewer.id }, { onConflict: "community_id,user_id", ignoreDuplicates: true }); assertOk(result.error, "Unable to request access."); return { message: `Your request is waiting for ${community.name}.` }
    }
    if (community.member_count >= community.capacity) throw new Error(`${community.name} is at capacity.`); assertOk((await client.from("communities").update({ member_count: community.member_count + 1 }).eq("id", communityId)).error, "Unable to update the community."); assertOk((await client.from("memberships").insert({ community_id: communityId, user_id: viewer.id, role: "new_member" })).error, "Unable to join the community."); return { message: `You joined ${community.name}. Your New Member badge is live.` };
  }
  if (action === "leave-community") {
    const membership = await client.from("memberships").select("role").eq("community_id", communityId).eq("user_id", viewer.id).maybeSingle(); if (!membership.data) throw new Error("You are not part of that community."); if (membership.data.role === "leader") throw new Error("Leaders cannot leave their community. Transfer leadership first."); assertOk((await client.from("memberships").delete().eq("community_id", communityId).eq("user_id", viewer.id)).error, "Unable to leave the community."); assertOk((await client.from("communities").update({ member_count: Math.max(community.member_count - 1, 1) }).eq("id", communityId)).error, "Unable to update the community."); return { message: `You left ${community.name}.` };
  }
  if (action === "create-callout") {
    const membership = await client.from("memberships").select("role").eq("community_id", communityId).eq("user_id", viewer.id).maybeSingle(); if (!membership.data) throw new Error("Join the community before posting a callout."); const ticker = requireText(payload.ticker, "Ticker", 2, 12).replace(/^\$/, "").toUpperCase(); if (!/^[A-Z0-9]+$/.test(ticker)) throw new Error("Ticker can only use letters and numbers."); const thesis = requireText(payload.thesis, "Callout", 12, 280); assertOk((await client.from("callouts").insert({ id: crypto.randomUUID(), community_id: communityId, author_id: viewer.id, ticker: `$${ticker}`, thesis })).error, "Unable to publish the callout."); const current = await client.from("communities").select("score,tier,integrity_status").eq("id", communityId).single(); assertOk(current.error, "Unable to update the community score."); const score = current.data?.score ?? 0; assertOk((await client.from("communities").update({ score: score === 0 ? 62 : Math.min(score + 1, 99), tier: score === 0 ? "bronze" : current.data?.tier, integrity_status: score === 0 ? "0 integrity flags" : current.data?.integrity_status }).eq("id", communityId)).error, "Unable to update the community score."); return { message: `$${ticker} is live. The community score has been updated.` };
  }
  if (action === "send-message") { const membership = await client.from("memberships").select("role").eq("community_id", communityId).eq("user_id", viewer.id).maybeSingle(); if (!membership.data) throw new Error("Join the community before posting in the room."); const body = requireText(payload.body, "Message", 1, 500); assertOk((await client.from("community_messages").insert({ id: crypto.randomUUID(), community_id: communityId, author_id: viewer.id, body })).error, "Unable to post that message."); return { message: "Message posted to the community room." }; }
  throw new Error("Unknown Pocket action.");
}
