import { z } from "zod";

export const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  metadata: z.object({
    id: z.number(),
    stars: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    updatedAt: z.string(),
    url: z.string().nullable().optional()
  })
});

export const userSchema = z.object({
  githubId: z.string(),
  accessToken: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable()
});

export type Repository = z.infer<typeof repositorySchema>;
export type User = z.infer<typeof userSchema>;
export type RepoList = Repository[];