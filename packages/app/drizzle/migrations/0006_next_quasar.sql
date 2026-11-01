ALTER TABLE `api_usage` ADD `project_id` text REFERENCES project(id);--> statement-breakpoint
CREATE INDEX `api_usage_project_idx` ON `api_usage` (`project_id`);