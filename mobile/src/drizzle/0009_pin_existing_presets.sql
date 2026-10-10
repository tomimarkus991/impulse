-- Untitled placeholder presets are replaced by "New preset" in the add sheet
DELETE FROM `preset` WHERE `title` = '';--> statement-breakpoint
UPDATE `preset` SET `position` = `id`;--> statement-breakpoint
UPDATE `preset` SET `pinned` = 1 WHERE `id` IN (SELECT `id` FROM `preset` ORDER BY `id` LIMIT 5);
