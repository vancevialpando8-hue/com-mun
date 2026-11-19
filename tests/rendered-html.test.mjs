import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the community experience instead of the starter preview", async () => {
  const [page, room, profile, battles, communities, css, layout] = await Promise.all([
    source("app/page.tsx"),
    source("app/community/[id]/page.tsx"),
    source("app/profile/page.tsx"),
    source("app/battles/page.tsx"),
    source("app/communities/page.tsx"),
    source("app/globals.css"),
    source("app/layout.tsx"),
  ]);

  assert.match(page, /fetch\("\/api\/pocket"/);
  assert.match(page, /create-community/);
  assert.match(page, /create-callout/);
  assert.match(page, /complete-challenge/);
  assert.match(page, /ScrollTrigger/);
  assert.match(page, /hero-signal/);
  assert.doesNotMatch(page, /picsum\.photos|hero-image/);
  assert.match(room, /Community talk/);
  assert.match(room, /Active callouts/);
  assert.match(room, /Member roster/);
  assert.match(profile, /Member profile/);
  assert.match(profile, /profile-photo-form/);
  assert.match(battles, /Leaderboard/);
  assert.match(battles, /Start 7-day battle/);
  assert.match(communities, /Pick one flag/);
  assert.match(communities, /join-community/);
  assert.match(css, /grid-auto-flow:dense/);
  assert.match(css, /@keyframes marquee/);
  assert.match(layout, /Com-Munitiez — conviction is collective/);
  assert.match(page, /Com-Munitiez/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});

test("persists the core Pocket workflows in D1", async () => {
  const [api, store, schema, hosting] = await Promise.all([
    source("app/api/pocket/route.ts"),
    source("db/pocket.ts"),
    source("db/schema.ts"),
    source(".openai/hosting.json"),
  ]);

  assert.match(api, /getPocketState/);
  assert.match(api, /runPocketAction/);
  assert.match(api, /getCommunityDetail/);
  assert.match(api, /getBattleState/);
  assert.match(store, /join-community/);
  assert.match(store, /leave-community/);
  assert.match(store, /Leave that crew before joining another one/);
  assert.match(store, /before creating a new crew/);
  assert.match(store, /join_requests/);
  assert.match(store, /member_count < capacity/);
  assert.match(store, /send-message/);
  assert.match(store, /save-wallet/);
  assert.match(store, /community_messages/);
  assert.match(store, /start-battle/);
  assert.match(schema, /export const battles/);
  assert.match(schema, /export const communities/);
  assert.match(schema, /export const memberships/);
  assert.match(schema, /memberships_user_id_unique/);
  assert.match(schema, /export const communityMessages/);
  assert.match(hosting, /"d1": "DB"/);
});
