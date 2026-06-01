ALTER TABLE `invoices` ADD COLUMN `contact_id` integer REFERENCES `contacts`(`id`);
