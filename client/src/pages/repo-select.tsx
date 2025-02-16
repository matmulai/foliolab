import { useState, useMemo } from "react";
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

const REPOS_PER_PAGE = 10;

export default function RepoSelect() {
  const [, setLocation] = useLocation();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Track pending repository toggles locally
  const [pendingToggles, setPendingToggles] = useState<Record<number, boolean>>({});

  const { data, isLoading } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"],
  });

  const { mutate: toggleRepo } = useMutation({
    mutationFn: async ({ id, selected }: { id: number; selected: boolean }) => {
      // Optimistically update the UI
      setPendingToggles(prev => ({ ...prev, [id]: selected }));

      try {
        const res = await apiRequest("POST", `/api/repositories/${id}/select`, {
          selected,
        });
        return res.json();
      } catch (error) {
        // Revert the optimistic update on error
        setPendingToggles(prev => ({ ...prev, [id]: !selected }));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update repository selection. Please try again.",
        variant: "destructive",
      });
    }
  });

  const { mutate: analyzeRepo, isPending: isAnalyzing } = useMutation({
    mutationFn: async ({ id, openaiKey }: { id: number; openaiKey: string }) => {
      const res = await apiRequest("POST", `/api/repositories/${id}/analyze`, {
        accessToken: localStorage.getItem("github_token"),
        username: localStorage.getItem("github_username"),
        openaiKey,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
    },
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const repositories = data?.repositories || [];
  const selectedRepos = repositories.filter((repo) => repo.selected);

  const handleSelectAll = (checked: boolean) => {
    const updatedToggles: Record<number, boolean> = {};
    paginatedRepos.forEach((repo) => {
      if (repo.selected !== checked) {
        updatedToggles[repo.id] = checked;
        toggleRepo({ id: repo.id, selected: checked });
      }
    });
    setPendingToggles(prev => ({ ...prev, ...updatedToggles }));
  };

  const handleAnalyzeRepos = async (openaiKey: string) => {
    try {
      // Analyze repositories sequentially to avoid rate limits
      for (const repo of selectedRepos) {
        await analyzeRepo({ id: repo.id, openaiKey });
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

  const allSelected = paginatedRepos.length > 0 && paginatedRepos.every((repo) => repo.selected);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                disabled={isAnalyzing || paginatedRepos.length === 0}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium whitespace-nowrap">
                Select All
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {paginatedRepos.map((repo) => {
            const isTogglePending = repo.id in pendingToggles;
            const effectiveSelected = isTogglePending ? pendingToggles[repo.id] : repo.selected;

            return (
              <Card key={repo.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4 p-4 md:p-6">
                  <Checkbox
                    checked={effectiveSelected}
                    onCheckedChange={(checked) =>
                      toggleRepo({ id: repo.id, selected: checked as boolean })
                    }
                    disabled={isAnalyzing}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{repo.name}</h3>
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
            );
          })}
        </div>

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

        {selectedRepos.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setShowApiKeyDialog(true)}
              disabled={isAnalyzing}
              className="w-full md:w-auto"
            >
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Portfolio ({selectedRepos.length} selected)
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