CREATE TABLE `community_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`community_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `wallet_address` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `wallet_pnl` text DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `member_status` text DEFAULT 'Scout' NOT NULL;