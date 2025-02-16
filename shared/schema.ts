import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
});

export interface Repository {
  id: number;
  name: string;
  description: string | null;
  url: string;
  summary: string | null;
  selected: boolean;
  metadata: {
    id: number;  // Added GitHub repository ID
    stars: number;
    language: string | null;
    topics: string[];
    updatedAt: string;
    url?: string | null;
  };
}

export const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  metadata: z.object({
    id: z.number(),  // Added GitHub repository ID validation
    stars: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    updatedAt: z.string(),
    url: z.string().nullable().optional()
  })
});

export type RepoList = Repository[];

export const insertUserSchema = createInsertSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;