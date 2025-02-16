import { useQuery } from "@tanstack/react-query";
import { Repository } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { DeploymentActions } from "@/components/deployment-actions";
import { useLocation } from "wouter";

export default function PortfolioPreview() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"],
  });

  useEffect(() => {
    if (data?.repositories && !isLoading) {
      const selectedRepos = data.repositories.filter((repo) => repo.selected);
      const allHaveSummaries = selectedRepos.every((repo) => repo.summary);

      if (allHaveSummaries) {
        toast({
          title: "Summaries Generated",
          description: "All repository summaries have been generated successfully!",
        });
      }
    }
  }, [data, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Skeleton className="h-12 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="grid gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-8 w-64" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedRepos = data?.repositories.filter((repo) => repo.selected) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-16">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/repos")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Repositories
            </Button>
            <h1 className="text-4xl font-bold">My Portfolio</h1>
          </header>

          <div className="grid gap-8">
            {selectedRepos.map((repo) => (
              <Card key={repo.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-semibold">{repo.name}</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      </Button>
                      {repo.metadata.url && (
                        <Button variant="outline" size="icon" asChild>
                          <a
                            href={repo.metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {repo.summary ? (
                    <>
                      <p className="text-muted-foreground mb-4">{repo.summary}</p>
                      <div className="flex gap-2 flex-wrap">
                        {repo.metadata.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-primary/10 rounded-full text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Skeleton className="h-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add deployment actions */}
          <DeploymentActions />
        </div>
      </div>
    </div>
  );
}