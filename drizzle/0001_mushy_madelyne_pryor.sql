PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_callouts` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`author_id` text NOT NULL,
	`ticker` text NOT NULL,
	`thesis` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_callouts`("id", "community_id", "author_id", "ticker", "thesis", "created_at") SELECT "id", "community_id", "author_id", "ticker", "thesis", "created_at" FROM `callouts`;--> statement-breakpoint
DROP TABLE `callouts`;--> statement-breakpoint
ALTER TABLE `__new_callouts` RENAME TO `callouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_challenge_completions` (
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`challenge_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_challenge_completions`("challenge_id", "user_id", "completed_at") SELECT "challenge_id", "user_id", "completed_at" FROM `challenge_completions`;--> statement-breakpoint
DROP TABLE `challenge_completions`;--> statement-breakpoint
ALTER TABLE `__new_challenge_completions` RENAME TO `challenge_completions`;--> statement-breakpoint
CREATE TABLE `__new_communities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`motto` text NOT NULL,
	`privacy` text NOT NULL,
	`owner_id` text NOT NULL,
	`member_count` integer DEFAULT 1 NOT NULL,
	`capacity` integer DEFAULT 50 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'rookie' NOT NULL,
	`weekly_pnl` text DEFAULT '0.0' NOT NULL,
	`integrity_status` text DEFAULT '0 integrity flags' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_communities`("id", "name", "tag", "motto", "privacy", "owner_id", "member_count", "capacity", "score", "tier", "weekly_pnl", "integrity_status", "created_at") SELECT "id", "name", "tag", "motto", "privacy", "owner_id", "member_count", "capacity", "score", "tier", "weekly_pnl", "integrity_status", "created_at" FROM `communities`;--> statement-breakpoint
DROP TABLE `communities`;--> statement-breakpoint
ALTER TABLE `__new_communities` RENAME TO `communities`;--> statement-breakpoint
CREATE UNIQUE INDEX `communities_name_unique` ON `communities` (`name`);--> statement-breakpoint
CREATE TABLE `__new_join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_join_requests`("id", "community_id", "user_id", "created_at") SELECT "id", "community_id", "user_id", "created_at" FROM `join_requests`;--> statement-breakpoint
DROP TABLE `join_requests`;--> statement-breakpoint
ALTER TABLE `__new_join_requests` RENAME TO `join_requests`;--> statement-breakpoint
CREATE TABLE `__new_memberships` (
	`community_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'new_member' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`community_id`, `user_id`),
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_memberships`("community_id", "user_id", "role", "joined_at") SELECT "community_id", "user_id", "role", "joined_at" FROM `memberships`;--> statement-breakpoint
DROP TABLE `memberships`;--> statement-breakpoint
ALTER TABLE `__new_memberships` RENAME TO `memberships`;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`xp` integer DEFAULT 240 NOT NULL,
	`referrals` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_profiles`("id", "display_name", "xp", "referrals", "created_at") SELECT "id", "display_name", "xp", "referrals", "created_at" FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;