ALTER TABLE `project` ADD `organization_id` text REFERENCES organization(id);--> statement-breakpoint
ALTER TABLE `project` ADD `team_id` text REFERENCES team(id);--> statement-breakpoint
CREATE INDEX `project_org_idx` ON `project` (`organization_id`);