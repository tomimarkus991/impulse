CREATE TABLE `preset` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text,
	`color` text,
	`locked` integer DEFAULT false
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`color` text NOT NULL,
	`locked` integer,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_event`("id", "color", "locked", "start", "end", "title") SELECT "id", "color", "locked", "start", "end", "title" FROM `event`;--> statement-breakpoint
DROP TABLE `event`;--> statement-breakpoint
ALTER TABLE `__new_event` RENAME TO `event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;