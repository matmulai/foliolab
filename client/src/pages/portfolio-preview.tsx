import { useQuery, useMutation } from "@tanstack/react-query";
import { Repository } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { DeploymentActions } from "@/components/deployment-actions";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSelector } from "@/components/theme-selector";
import { themes } from "@shared/themes";
import { cn } from "@/lib/utils";

interface UserIntroduction {
  introduction: string;
  skills: string[];
  interests: string[];
}

interface UserInfo {
  username: string;
  avatarUrl: string | null;
}

export default function PortfolioPreview() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>([]);
  const [userIntro, setUserIntro] = useState<UserIntroduction | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("modern");
  const theme = themes.find((t) => t.id === selectedTheme) || themes[0];

  // Get repository data from client-side cache
  const { data, isLoading, error } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"],
    retry: 2
  });

  // Generate user introduction
  const { mutate: generateIntro, isPending: isGenerating } = useMutation({
    mutationFn: async (repositories: Repository[]) => {
      const res = await apiRequest("POST", "/api/user/introduction", {
        repositories,
        openaiKey: localStorage.getItem("openai_api_key"), // Optional
      });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setUserIntro(data.introduction);
      setUserInfo(data.user);
    },
    onError: (err) => {
      console.error('Error generating introduction:', err);
      toast({
        title: "Warning",
        description: "Could not generate personalized introduction. Proceeding with basic preview.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (data?.repositories && !isLoading) {
      const filtered = data.repositories.filter((repo) => repo.selected);
      setSelectedRepos(filtered);

      if (filtered.length > 0) {
        generateIntro(filtered);
      } else {
        toast({
          title: "No Repositories Selected",
          description: "Please go back and select repositories to include in your portfolio.",
          variant: "destructive",
        });
      }
    }
  }, [data, isLoading, toast, generateIntro]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Portfolio</h1>
            <p className="text-gray-600 mb-6">Failed to load repository data. Please try again.</p>
            <Button onClick={() => setLocation("/repos")}>
              Return to Repository Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Skeleton className="h-32 w-32 rounded-full mx-auto mb-6" />
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

  const renderPortfolioContent = () => {
    const isMinimal = selectedTheme === "minimal";
    const isModern = selectedTheme === "modern";
    const isElegant = selectedTheme === "elegant";
    
    return (
      <div className={
        isMinimal || isElegant
          ? "" // For Minimal and Elegant, we'll apply the grid layout at the parent level
          : cn(theme.layout.content, "grid grid-cols-1 gap-6") // For others, use theme styling plus grid
      }>
        {selectedRepos.map((repo) => (
          <Card 
            key={repo.id} 
            className={cn(
              theme.preview.card,
              isMinimal ? "mb-2" : "mb-6", // Reduce spacing for Minimal theme
              isElegant ? "border-l-4 border-stone-900 rounded-none" : "", // Special styling for Elegant theme
              isModern ? "shadow-lg hover:shadow-xl transition-shadow" : ""
            )}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <h2 className={cn("text-2xl font-semibold", theme.preview.text)}>
                  {repo.name}
                </h2>
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
                  <p className={cn("mb-4", theme.preview.text)}>
                    {repo.summary}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {repo.metadata.topics.map((topic) => (
                      <span
                        key={topic}
                        className={
                          isModern
                            ? "px-2 py-1 rounded-full text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                            : "px-2 py-1 rounded-full text-sm bg-slate-800 text-white" // Explicit styling for Minimal theme
                        }
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
    );
  };

  const renderProfile = () => {
    // For Minimal theme, we're already setting the grid cell at the parent level
    const isMinimal = selectedTheme === "minimal";
    
    // Create the profile content
    return (
      <div className={
        isMinimal
          ? "sticky top-8 flex flex-col items-center" // Simplified for Minimal, as we set the container above
          : cn(theme.layout.header, "flex flex-col") // Use theme styling for other themes
      }>
        {userInfo && (
          <>
            <Avatar className="w-32 h-32 mb-6">
              <AvatarImage src={userInfo.avatarUrl || undefined} alt={userInfo.username} />
              <AvatarFallback>{userInfo.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h1 className={cn("text-4xl font-bold mb-6", theme.preview.text)}>
              {userInfo.username}'s Portfolio
            </h1>
          </>
        )}

        {userIntro && (
          <div className={cn("space-y-6", isMinimal ? "text-left" : "text-center")}>
            <p className={cn("leading-relaxed", theme.preview.text)}>{userIntro.introduction}</p>
            <div className={cn("flex flex-wrap gap-2", isMinimal ? "" : "justify-center")}>
              {userIntro.skills.map((skill, index) => (
                <span
                  key={index}
                  className={
                    selectedTheme === "modern"
                      ? "px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "px-3 py-1 rounded-full text-sm font-medium bg-slate-800 text-white" // Explicit styling for Minimal theme
                  }
                >
                  {skill}
                </span>
              ))}
            </div>
            <p className={cn("text-sm", theme.preview.text)}>
              <span className="font-medium">Interests:</span>{" "}
              {userIntro.interests.join(", ")}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("min-h-screen transition-colors", theme.preview.background)}>
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between mb-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/repos")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Repositories
            </Button>

            <ThemeSelector
              value={selectedTheme}
              onValueChange={setSelectedTheme}
            />
          </div>

          {/* For specific themes, use explicit grid layouts */}
          {selectedTheme === "minimal" ? (
            // Minimal theme layout - 2 columns with left sidebar
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 flex justify-center">
                {renderProfile()}
              </div>
              <div className="lg:col-span-8">
                {renderPortfolioContent()}
              </div>
            </div>
          ) : selectedTheme === "elegant" ? (
            // Elegant theme layout - grid layout with repos side by side
            <>
              <div className="flex justify-center mb-16">
                {renderProfile()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {renderPortfolioContent()}
              </div>
            </>
          ) : (
            // Default layout for other themes
            <div className={theme.layout.container}>
              {renderProfile()}
              {renderPortfolioContent()}
            </div>
          )}

          <DeploymentActions
            repositories={selectedRepos}
            userInfo={userInfo}
            introduction={userIntro}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}