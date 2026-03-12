CREATE TABLE `group_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`total_score` real DEFAULT 0 NOT NULL,
	`setting_score` real DEFAULT 0 NOT NULL,
	`guessing_score` real DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`turn_deadline_hour` integer DEFAULT 20 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_invite_code_unique` ON `groups` (`invite_code`);--> statement-breakpoint
CREATE TABLE `guess_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`puzzle_id` text NOT NULL,
	`guesser_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reveals_used` integer DEFAULT 0 NOT NULL,
	`reveal_history` text DEFAULT '[]' NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`setter_score` real DEFAULT 0 NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`puzzle_id`) REFERENCES `puzzles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guesser_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guesses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`reveal_level` integer DEFAULT 0 NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	`points_awarded` real DEFAULT 0 NOT NULL,
	`llm_reasoning` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `guess_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `puzzles` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`setter_id` text NOT NULL,
	`turn_date` text NOT NULL,
	`subject_photo_url` text NOT NULL,
	`sub_portions` text DEFAULT '[]' NOT NULL,
	`clue_photo_urls` text DEFAULT '[]' NOT NULL,
	`answer_what` text,
	`answer_who` text,
	`answer_where` text,
	`answer_when` text,
	`text_clues` text DEFAULT '[]' NOT NULL,
	`total_points` integer DEFAULT 25 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`setter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);