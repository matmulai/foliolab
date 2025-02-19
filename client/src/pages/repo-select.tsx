import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Repository } from "@shared/schema";
import { Loader2, Search } from "lucide-react";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { useToast } from "@/hooks/use-toast";
import { toggleRepositorySelection, saveRepositories, getRepositories } from "@/lib/storage";

const REPOS_PER_PAGE = 10;

export default function RepoSelect() {
  const [, setLocation] = useLocation();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"]
  });

  // Sync query cache with local storage
  useEffect(() => {
    if (data?.repositories) {
      const storedRepos = getRepositories();
      const mergedRepos = data.repositories.map(repo => ({
        ...repo,
        selected: storedRepos.find(r => r.id === repo.id)?.selected || false
      }));

      // Update both storage and cache
      saveRepositories(mergedRepos);
      queryClient.setQueryData<{ repositories: Repository[] }>(["/api/repositories"], {
        repositories: mergedRepos
      });

      console.log('Synced repositories:', {
        total: mergedRepos.length,
        selected: mergedRepos.filter(r => r.selected).length
      });
    }
  }, [data]);

  const { mutate: toggleRepo, isPending: isToggling } = useMutation({
    mutationFn: async ({ id, selected }: { id: number; selected: boolean }) => {
      if (!id) throw new Error('Repository ID is required');

      // Update local storage and get the updated repo
      const updatedRepo = toggleRepositorySelection(id);
      if (!updatedRepo) throw new Error('Failed to update repository selection');

      return updatedRepo;
    },
    onMutate: ({ id, selected }) => {
      const previousData = queryClient.getQueryData<{ repositories: Repository[] }>(["/api/repositories"]);

      if (previousData) {
        const updatedRepos = previousData.repositories.map(repo =>
          repo.id === id ? { ...repo, selected } : repo
        );

        // Update both cache and storage synchronously
        queryClient.setQueryData<{ repositories: Repository[] }>(["/api/repositories"], {
          repositories: updatedRepos
        });
        saveRepositories(updatedRepos);

        console.log('Updated selection:', {
          repoId: id,
          selected,
          totalSelected: updatedRepos.filter(r => r.selected).length
        });
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      console.error('Error toggling repository:', error);
      if (context?.previousData) {
        // Revert both cache and storage
        queryClient.setQueryData(["/api/repositories"], context.previousData);
        saveRepositories(context.previousData.repositories);
      }

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

  console.log('Current state:', {
    totalRepos: data?.repositories?.length || 0,
    selectedCount,
    pageRepos: paginatedRepos.length
  });

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
      // Analyze repositories sequentially to avoid rate limits
      for (const repo of selectedRepos) {
        if (repo.id) {
          await analyzeRepo({ 
            id: repo.id, 
            openaiKey,
            customPrompt 
          });
        }
      }

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
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header and search section */}
        <div className="flex flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Select Repositories</h1>
          <div className="w-full md:w-auto flex items-center gap-4">
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

        {/* Generate Portfolio button */}
        {selectedCount > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setShowApiKeyDialog(true)}
              disabled={isToggling}
              className="w-full md:w-auto"
            >
              Generate Portfolio ({selectedCount} selected)
            </Button>
          </div>
        )}
      </div>

      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenAIKey={handleAnalyzeRepos}
        onClose={() => setShowApiKeyDialog(false)}
      />
    </div>
  );
}