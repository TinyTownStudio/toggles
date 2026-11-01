CREATE TABLE `api_usage` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`reads` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_user_month_unique` ON `api_usage` (`user_id`,`month`);