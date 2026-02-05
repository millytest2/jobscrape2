import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Saved jobs table - allows users to bookmark jobs from scrape results
 * Stores job metadata so users can review all 425+ jobs and save the best ones
 */
export const savedJobs = mysqlTable("saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  
  // Job metadata from scrape results
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  url: text("url").notNull(),
  source: varchar("source", { length: 64 }).notNull(), // e.g., "Adzuna", "LinkedIn (Apify)"
  
  // Scoring data
  finalScore: int("finalScore"), // Total match score (0-100)
  experienceScore: int("experienceScore"),
  roleScore: int("roleScore"),
  locationScore: int("locationScore"),
  skillsScore: int("skillsScore"),
  companyScore: int("companyScore"),
  missionScore: int("missionScore"),
  
  // Additional metadata
  description: text("description"),
  postedDate: varchar("postedDate", { length: 64 }),
  salary: varchar("salary", { length: 128 }),
  
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});

export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = typeof savedJobs.$inferInsert;

/**
 * Seen jobs table - tracks which jobs user has already viewed across scrape runs
 * Prevents showing the same jobs repeatedly
 */
export const seenJobs = mysqlTable("seen_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  jobUrl: text("jobUrl").notNull(), // Unique identifier for the job
  jobTitle: text("jobTitle"),
  company: text("company"),
  seenAt: timestamp("seenAt").defaultNow().notNull(),
});

export type SeenJob = typeof seenJobs.$inferSelect;
export type InsertSeenJob = typeof seenJobs.$inferInsert;