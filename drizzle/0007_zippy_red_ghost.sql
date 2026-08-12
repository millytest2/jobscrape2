CREATE TABLE `resume_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileName` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` text NOT NULL,
	`storageUrl` text NOT NULL,
	`extractedData` text,
	`parseStatus` enum('ready','failed') NOT NULL DEFAULT 'ready',
	`parseError` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resume_documents_id` PRIMARY KEY(`id`)
);
