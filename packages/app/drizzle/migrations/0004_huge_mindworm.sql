CREATE TABLE `environment` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `environment_project_idx` ON `environment` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `environment_project_slug_unique` ON `environment` (`project_id`,`slug`);--> statement-breakpoint
CREATE TABLE `toggle_state` (
	`toggle_id` text NOT NULL,
	`environment_id` text NOT NULL,
	`enabled` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`toggle_id`) REFERENCES `toggle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`environment_id`) REFERENCES `environment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `toggle_state_toggle_env_unique` ON `toggle_state` (`toggle_id`,`environment_id`);--> statement-breakpoint
CREATE INDEX `toggle_state_env_idx` ON `toggle_state` (`environment_id`);