CREATE TABLE `event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`color` text NOT NULL,
	`locked` integer,
	`calendarId` integer,
	`start` text,
	`end` text,
	`title` text
);
