ALTER TABLE `profiles` ADD `avatar_key` text;
--> statement-breakpoint
ALTER TABLE `communities` ADD `icon_key` text;
--> statement-breakpoint
UPDATE `communities` SET `tier` = 'bronze' WHERE `tier` = 'rookie';
