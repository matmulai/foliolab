import { z } from "zod";

// Source types for portfolio content
export const sourceTypeSchema = z.enum([
  "github",
  "gitlab",
  "bitbucket",
  "blog_rss",
  "medium",
  "linkedin",
  "freeform"
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;

// GitHub Repository Schema
export const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string().nullable().optional(), // Title from README.md
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("github").default("github"),
  owner: z.object({
    login: z.string(),
    type: z.enum(["User", "Organization"]),
    avatarUrl: z.string().nullable()
  }),
  metadata: z.object({
    id: z.number(),
    stars: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    updatedAt: z.string(),
    url: z.string().nullable().optional()
  })
});

// GitLab Repository Schema
export const gitlabRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("gitlab"),
  owner: z.object({
    login: z.string(),
    type: z.enum(["User", "Organization"]),
    avatarUrl: z.string().nullable()
  }),
  metadata: z.object({
    id: z.number(),
    stars: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    updatedAt: z.string(),
    url: z.string().nullable().optional()
  })
});

// Bitbucket Repository Schema
export const bitbucketRepositorySchema = z.object({
  id: z.string(), // Bitbucket uses UUID strings
  name: z.string(),
  displayName: z.string().nullable().optional(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("bitbucket"),
  owner: z.object({
    login: z.string(),
    type: z.enum(["User", "Organization"]),
    avatarUrl: z.string().nullable()
  }),
  metadata: z.object({
    id: z.string(),
    stars: z.number().default(0), // Bitbucket doesn't have stars
    language: z.string().nullable(),
    topics: z.array(z.string()).default([]),
    updatedAt: z.string(),
    url: z.string().nullable().optional()
  })
});

// Blog Post Schema (from RSS)
export const blogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("blog_rss"),
  publishedAt: z.string(),
  author: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  feedUrl: z.string() // Original RSS feed URL
});

// Medium Post Schema
export const mediumPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("medium"),
  publishedAt: z.string(),
  author: z.string(),
  tags: z.array(z.string()).default([]),
  claps: z.number().nullable().optional(),
  readTime: z.number().nullable().optional() // minutes
});

// LinkedIn Post Schema
export const linkedinPostSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  url: z.string().nullable(),
  summary: z.string().nullable(),
  selected: z.boolean(),
  source: z.literal("linkedin"),
  publishedAt: z.string(),
  author: z.string(),
  reactions: z.number().nullable().optional(),
  comments: z.number().nullable().optional()
});

// Free-form Content Schema
export const freeformContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  description: z.string().nullable(),
  url: z.string().nullable().optional(),
  selected: z.boolean(),
  source: z.literal("freeform"),
  createdAt: z.string(),
  contentType: z.enum(["project", "achievement", "skill", "experience", "other"]).default("other"),
  tags: z.array(z.string()).default([])
});

// Unified Portfolio Item Schema (discriminated union)
export const portfolioItemSchema = z.discriminatedUnion("source", [
  repositorySchema,
  gitlabRepositorySchema,
  bitbucketRepositorySchema,
  blogPostSchema,
  mediumPostSchema,
  linkedinPostSchema,
  freeformContentSchema
]);

// User Schema
export const userSchema = z.object({
  githubId: z.string(),
  accessToken: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable()
});

// Organization Schema
export const orgSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable()
});

// Data Source Configuration Schema
export const dataSourceConfigSchema = z.object({
  type: sourceTypeSchema,
  enabled: z.boolean(),
  config: z.record(z.string(), z.any()).optional() // Flexible config for each source
});

export type Repository = z.infer<typeof repositorySchema>;
export type GitLabRepository = z.infer<typeof gitlabRepositorySchema>;
export type BitbucketRepository = z.infer<typeof bitbucketRepositorySchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type MediumPost = z.infer<typeof mediumPostSchema>;
export type LinkedInPost = z.infer<typeof linkedinPostSchema>;
export type FreeformContent = z.infer<typeof freeformContentSchema>;
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
export type User = z.infer<typeof userSchema>;
export type Organization = z.infer<typeof orgSchema>;
export type DataSourceConfig = z.infer<typeof dataSourceConfigSchema>;
export type RepoList = Repository[];