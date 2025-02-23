import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Repository } from "@shared/schema";
import { Search } from "lucide-react";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { useToast } from "@/hooks/use-toast";
import { toggleRepositorySelection, saveRepositories, getRepositories } from "@/lib/storage";
import { AnalysisProgress } from "@/components/analysis-progress";

const REPOS_PER_PAGE = 10;

export default function RepoSelect() {
  const [, setLocation] = useLocation();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const [analysisProgress, setAnalysisProgress] = useState({
    isAnalyzing: false,
    currentRepo: 0,
    repoName: '',
    progress: 0
  });

  const { data, isLoading } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"],
    initialData: () => {
      // Load initial data from storage
      const storedRepos = getRepositories();
      return storedRepos.length ? { repositories: storedRepos } : undefined;
    }
  });

  const { mutate: toggleRepo, isPending: isToggling } = useMutation({
    mutationFn: async ({ id, selected }: { id: number; selected: boolean }) => {
      if (!id) throw new Error('Repository ID is required');

      // Get the current repository data
      const repositories = data?.repositories || [];
      const updatedRepo = {
        ...repositories.find(r => r.id === id)!,
        selected
      };

      // Update both cache and storage atomically
      const updatedRepos = repositories.map(repo =>
        repo.id === id ? updatedRepo : repo
      );

      // Save to storage first
      saveRepositories(updatedRepos);

      // Update cache
      queryClient.setQueryData<{ repositories: Repository[] }>(["/api/repositories"], {
        repositories: updatedRepos
      });

      return updatedRepo;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update repository selection",
        variant: "destructive",
      });
    }
  });

  const filteredRepos = useMemo(() => {
    if (!data?.repositories) return [];
    return data.repositories.filter((repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );
  }, [data?.repositories, searchQuery]);

  const paginatedRepos = useMemo(() => {
    const startIndex = (currentPage - 1) * REPOS_PER_PAGE;
    return filteredRepos.slice(startIndex, startIndex + REPOS_PER_PAGE);
  }, [filteredRepos, currentPage]);

  const totalPages = Math.ceil((filteredRepos?.length || 0) / REPOS_PER_PAGE);
  const selectedRepos = data?.repositories.filter((repo) => repo.selected) || [];
  const selectedCount = selectedRepos.length;

  const handleSelectAll = (checked: boolean) => {
    paginatedRepos.forEach((repo) => {
      if (repo.id && repo.selected !== checked) {
        toggleRepo({ id: repo.id, selected: checked });
      }
    });
  };

  const allSelected = paginatedRepos.length > 0 && paginatedRepos.every((repo) => repo.selected);

  const handleAnalyzeRepos = async (openaiKey: string, customPrompt?: string) => {
    try {
      setAnalysisProgress({
        isAnalyzing: true,
        currentRepo: 0,
        repoName: '',
        progress: 0
      });

      // Analyze repositories sequentially to avoid rate limits
      for (let i = 0; i < selectedRepos.length; i++) {
        const repo = selectedRepos[i];
        if (repo.id) {
          setAnalysisProgress(prev => ({
            ...prev,
            currentRepo: i + 1,
            repoName: repo.name,
            progress: (i / selectedRepos.length) * 100
          }));

          const res = await apiRequest("POST", `/api/repositories/${repo.id}/analyze`, {
            accessToken: localStorage.getItem("github_token"),
            username: localStorage.getItem("github_username"),
            openaiKey,
            customPrompt,
          });

          if (!res.ok) {
            throw new Error('Failed to analyze repository');
          }

          const data = await res.json();

          // Update the cache with the new summary
          queryClient.setQueryData<{ repositories: Repository[] }>(["/api/repositories"], (old) => {
            if (!old) return old;
            return {
              repositories: old.repositories.map(r =>
                r.id === data.repository.id ? { ...r, summary: data.repository.summary } : r
              )
            };
          });
        }
      }

      // Set progress to 100% when complete
      setAnalysisProgress(prev => ({
        ...prev,
        progress: 100
      }));

      // Small delay to show 100% completion before navigating
      await new Promise(resolve => setTimeout(resolve, 500));

      setLocation("/preview");
      toast({
        title: "Success",
        description: "Repository analysis complete!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze repositories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalysisProgress({
        isAnalyzing: false,
        currentRepo: 0,
        repoName: '',
        progress: 0
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header and search section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Select Repositories</h1>
          <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={isToggling || paginatedRepos.length === 0}
                />
                <label htmlFor="select-all" className="text-sm font-medium whitespace-nowrap">
                  Select All
                </label>
              </div>
              {selectedCount > 0 && (
                <Button
                  onClick={() => setShowApiKeyDialog(true)}
                  disabled={isToggling}
                >
                  Generate Portfolio ({selectedCount} selected)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Repository list */}
        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))
          ) : (
            paginatedRepos.map((repo) => (
              <Card key={repo.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4 p-4 md:p-6">
                  <Checkbox
                    id={`repo-${repo.id}`}
                    checked={repo.selected}
                    onCheckedChange={(checked) => {
                      if (repo.id) {
                        toggleRepo({ id: repo.id, selected: !!checked });
                      }
                    }}
                    disabled={isToggling}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`repo-${repo.id}`}
                      className="text-lg font-semibold cursor-pointer"
                    >
                      {repo.name}
                    </label>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {repo.description}
                      </p>
                    )}
                    {repo.metadata.language && (
                      <div className="mt-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {repo.metadata.language}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}


        {/* Generate Portfolio button - This part is removed as per instruction */}
        
      </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenAIKey={handleAnalyzeRepos}
        onClose={() => setShowApiKeyDialog(false)}
      />

      <AnalysisProgress
        open={analysisProgress.isAnalyzing}
        totalRepos={selectedRepos.length}
        currentRepo={analysisProgress.currentRepo}
        repoName={analysisProgress.repoName}
        progress={analysisProgress.progress}
      />
    </div>
  );
}