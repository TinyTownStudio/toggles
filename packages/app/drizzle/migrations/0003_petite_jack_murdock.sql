DROP INDEX `subscription_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_user_unique` ON `subscription` (`user_id`);