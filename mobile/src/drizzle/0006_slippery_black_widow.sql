PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_preset` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`color` text NOT NULL,
	`locked` integer DEFAULT false
);
--> statement-breakpoint
INSERT INTO `__new_preset`("id", "title", "color", "locked") SELECT "id", "title", "color", "locked" FROM `preset`;--> statement-breakpoint
DROP TABLE `preset`;--> statement-breakpoint
ALTER TABLE `__new_preset` RENAME TO `preset`;--> statement-breakpoint
PRAGMA foreign_keys=ON;