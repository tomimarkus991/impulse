ALTER TABLE `preset` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `preset` ADD `position` integer DEFAULT 0 NOT NULL;