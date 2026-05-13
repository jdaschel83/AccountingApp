CREATE TABLE `active_timers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer,
	`description` text DEFAULT '' NOT NULL,
	`started_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`hours` real NOT NULL,
	`rate` real,
	`billable` integer DEFAULT 1 NOT NULL,
	`billed` integer DEFAULT 0 NOT NULL,
	`invoice_id` integer,
	`started_at` text,
	`stopped_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
