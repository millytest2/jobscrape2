CREATE TABLE `scrape_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` text NOT NULL,
	`location` text NOT NULL,
	`profileName` varchar(64),
	`jobs` text NOT NULL,
	`stats` text,
	`boostStatus` enum('pending','boosted','no_boost') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scrape_results_id` PRIMARY KEY(`id`)
);
