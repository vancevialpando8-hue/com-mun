import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  xp: integer("xp").notNull().default(240),
  referrals: integer("referrals").notNull().default(0),
  walletAddress: text("wallet_address"),
  walletPnl: text("wallet_pnl").notNull().default("0.0"),
  avatarKey: text("avatar_key"),
  memberStatus: text("member_status").notNull().default("Scout"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communities = sqliteTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull(),
  motto: text("motto").notNull(),
  privacy: text("privacy", { enum: ["public", "private"] }).notNull(),
  ownerId: text("owner_id").notNull(),
  memberCount: integer("member_count").notNull().default(1),
  capacity: integer("capacity").notNull().default(50),
  score: integer("score").notNull().default(0),
  tier: text("tier", { enum: ["bronze", "silver", "gold", "diamond"] }).notNull().default("bronze"),
  iconKey: text("icon_key"),
  weeklyPnl: text("weekly_pnl").notNull().default("0.0"),
  integrityStatus: text("integrity_status").notNull().default("0 integrity flags"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberships = sqliteTable("memberships", {
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["leader", "co_leader", "elder", "new_member"] }).notNull().default("new_member"),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.communityId, table.userId] })]);

export const joinRequests = sqliteTable("join_requests", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const callouts = sqliteTable("callouts", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  thesis: text("thesis").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const communityMessages = sqliteTable("community_messages", {
  id: text("id").primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const battles = sqliteTable("battles", {
  id: text("id").primaryKey(),
  challengerCommunityId: text("challenger_community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  opponentCommunityId: text("opponent_community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["active", "complete"] }).notNull().default("active"),
  prizePoints: integer("prize_points").notNull().default(1200),
  endsAt: text("ends_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const challengeCompletions = sqliteTable("challenge_completions", {
  challengeId: text("challenge_id").notNull(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.challengeId, table.userId] })]);
