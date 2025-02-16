import { User, Repository, InsertUser, InsertRepository } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getRepositories(userId: number): Promise<Repository[]>;
  createRepository(repo: InsertRepository): Promise<Repository>;
  updateRepositorySelection(id: number, selected: boolean): Promise<Repository>;
  updateRepositorySummary(id: number, summary: string): Promise<Repository>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private repos: Map<number, Repository>;
  private currentUserId: number;
  private currentRepoId: number;

  constructor() {
    this.users = new Map();
    this.repos = new Map();
    this.currentUserId = 1;
    this.currentRepoId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.githubId === githubId);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = {
      ...userData,
      id,
      avatarUrl: userData.avatarUrl || null
    };
    this.users.set(id, user);
    return user;
  }

  async getRepositories(userId: number): Promise<Repository[]> {
    return Array.from(this.repos.values()).filter(r => r.userId === userId);
  }

  async createRepository(repoData: InsertRepository): Promise<Repository> {
    const id = this.currentRepoId++;
    const repo = {
      ...repoData,
      id,
      description: repoData.description || null,
      summary: repoData.summary || null,
      selected: repoData.selected || false
    };
    this.repos.set(id, repo);
    return repo;
  }

  async updateRepositorySelection(id: number, selected: boolean): Promise<Repository> {
    const repo = this.repos.get(id);
    if (!repo) throw new Error("Repository not found");
    const updated = { ...repo, selected };
    this.repos.set(id, updated);
    return updated;
  }

  async updateRepositorySummary(id: number, summary: string): Promise<Repository> {
    const repo = this.repos.get(id);
    if (!repo) throw new Error("Repository not found");
    const updated = { ...repo, summary: summary || null };
    this.repos.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();