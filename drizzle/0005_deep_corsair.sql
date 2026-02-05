CREATE TABLE `seen_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobUrl` text NOT NULL,
	`jobTitle` text,
	`company` text,
	`seenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seen_jobs_id` PRIMARY KEY(`id`)
);
