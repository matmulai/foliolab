import { useQuery, useMutation } from "@tanstack/react-query";
import { Repository } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, ExternalLink, ArrowLeft, Edit2, Check, X, Plus, Camera, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { DeploymentActions } from "@/components/deployment-actions";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSelector } from "@/components/theme-selector";
import { themes } from "@shared/themes";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface UserIntroduction {
  introduction: string;
  skills: string[];
  interests: string[];
  customImageUrl?: string;
}

interface UserInfo {
  username: string;
  avatarUrl: string | null;
}

// Helper function to capitalize first letter
const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function PortfolioPreview() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>([]);
  const [userIntro, setUserIntro] = useState<UserIntroduction | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("modern");
  const theme = themes.find((t) => t.id === selectedTheme) || themes[0];

  // Edit state management
  const [editingIntro, setEditingIntro] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [editingRepo, setEditingRepo] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingRepoTitle, setEditingRepoTitle] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState(false);
  
  // Temporary edit values
  const [tempIntro, setTempIntro] = useState("");
  const [tempSkills, setTempSkills] = useState<string[]>([]);
  const [tempInterests, setTempInterests] = useState<string[]>([]);
  const [tempRepoSummary, setTempRepoSummary] = useState("");
  const [tempTitle, setTempTitle] = useState("");
  const [tempRepoTitle, setTempRepoTitle] = useState("");
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Get repository data from client-side cache
  const { data, isLoading, error } = useQuery<{ repositories: Repository[] }>({
    queryKey: ["/api/repositories"],
    retry: 2,
  });

  // Generate user introduction
  const { mutate: generateIntro, isPending: isGenerating } = useMutation({
    mutationFn: async (repositories: Repository[]) => {
      const res = await apiRequest("POST", "/api/user/introduction", {
        repositories
      });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setUserIntro(data.introduction);
      setUserInfo(data.user);
    },
    onError: (err) => {
      console.error("Error generating introduction:", err);
      toast({
        title: "Warning",
        description:
          "Could not generate personalized introduction. Proceeding with basic preview.",
        variant: "destructive",
      });
    },
  });

  // Edit handlers
  const startEditingIntro = () => {
    if (userIntro) {
      setTempIntro(userIntro.introduction);
      setEditingIntro(true);
    }
  };

  const startEditingSkills = () => {
    if (userIntro) {
      setTempSkills([...userIntro.skills]);
      setEditingSkills(true);
    }
  };

  const startEditingInterests = () => {
    if (userIntro) {
      setTempInterests([...userIntro.interests]);
      setEditingInterests(true);
    }
  };

  const startEditingRepo = (repoId: number, summary: string) => {
    setTempRepoSummary(summary);
    setEditingRepo(repoId);
  };

  const startEditingTitle = () => {
    if (userInfo) {
      setTempTitle(`${capitalizeFirstLetter(userInfo.username)}'s Portfolio`);
      setEditingTitle(true);
    }
  };

  const startEditingRepoTitle = (repoId: number, title: string) => {
    setTempRepoTitle(title);
    setEditingRepoTitle(repoId);
  };

  const startEditingImage = () => {
    setTempImageUrl(userIntro?.customImageUrl || "");
    setEditingImage(true);
  };

  const saveIntro = () => {
    if (userIntro) {
      setUserIntro({ ...userIntro, introduction: tempIntro });
      setEditingIntro(false);
      toast({
        title: "Introduction Updated",
        description: "Your introduction has been updated successfully.",
      });
    }
  };

  const saveSkills = () => {
    if (userIntro) {
      setUserIntro({ ...userIntro, skills: tempSkills });
      setEditingSkills(false);
      toast({
        title: "Skills Updated",
        description: "Your skills have been updated successfully.",
      });
    }
  };

  const saveInterests = () => {
    if (userIntro) {
      setUserIntro({ ...userIntro, interests: tempInterests });
      setEditingInterests(false);
      toast({
        title: "Interests Updated",
        description: "Your interests have been updated successfully.",
      });
    }
  };

  const saveRepoSummary = () => {
    if (editingRepo !== null) {
      setSelectedRepos(repos =>
        repos.map(repo =>
          repo.id === editingRepo
            ? { ...repo, summary: tempRepoSummary }
            : repo
        )
      );
      setEditingRepo(null);
      toast({
        title: "Repository Summary Updated",
        description: "The repository summary has been updated successfully.",
      });
    }
  };

  const saveTitle = () => {
    setCustomTitle(tempTitle);
    setEditingTitle(false);
    toast({
      title: "Portfolio Title Updated",
      description: "Your portfolio title has been updated successfully.",
    });
  };

  const saveRepoTitle = () => {
    if (editingRepoTitle !== null) {
      setSelectedRepos(repos =>
        repos.map(repo =>
          repo.id === editingRepoTitle
            ? { ...repo, displayName: tempRepoTitle }
            : repo
        )
      );
      setEditingRepoTitle(null);
      toast({
        title: "Repository Title Updated",
        description: "The repository title has been updated successfully.",
      });
    }
  };

  const saveImageUrl = () => {
    if (userIntro) {
      setUserIntro({ ...userIntro, customImageUrl: tempImageUrl });
      setEditingImage(false);
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been updated successfully.",
      });
    }
  };

  const cancelEdit = () => {
    setEditingIntro(false);
    setEditingSkills(false);
    setEditingInterests(false);
    setEditingRepo(null);
    setEditingTitle(false);
    setEditingRepoTitle(null);
    setEditingImage(false);
    setTempIntro("");
    setTempSkills([]);
    setTempInterests([]);
    setTempRepoSummary("");
    setTempTitle("");
    setTempRepoTitle("");
    setTempImageUrl("");
    setNewSkill("");
    setNewInterest("");
  };

  const addSkill = () => {
    if (newSkill.trim() && !tempSkills.includes(newSkill.trim())) {
      setTempSkills([...tempSkills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setTempSkills(tempSkills.filter((_, i) => i !== index));
  };

  const addInterest = () => {
    if (newInterest.trim() && !tempInterests.includes(newInterest.trim())) {
      setTempInterests([...tempInterests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (index: number) => {
    setTempInterests(tempInterests.filter((_, i) => i !== index));
  };

  const deleteRepoSummary = (repoId: number) => {
    setSelectedRepos(repos =>
      repos.map(repo =>
        repo.id === repoId
          ? { ...repo, summary: "" }
          : repo
      )
    );
    toast({
      title: "Repository Summary Deleted",
      description: "The repository summary has been removed.",
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newRepos = [...selectedRepos];
    const draggedRepo = newRepos[draggedIndex];
    
    // Remove the dragged item
    newRepos.splice(draggedIndex, 1);
    
    // Insert at the new position
    newRepos.splice(dropIndex, 0, draggedRepo);
    
    setSelectedRepos(newRepos);
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    toast({
      title: "Repository Reordered",
      description: "The repository order has been updated.",
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    if (data?.repositories && !isLoading) {
      const filtered = data.repositories.filter((repo) => repo.selected);
      setSelectedRepos(filtered);

      if (filtered.length > 0) {
        generateIntro(filtered);
      } else {
        toast({
          title: "No Repositories Selected",
          description:
            "Please go back and select repositories to include in your portfolio.",
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
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Error Loading Portfolio
            </h1>
            <p className="text-gray-600 mb-6">
              Failed to load repository data. Please try again.
            </p>
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

    // Skip rendering for Elegant theme as we handle it directly in the layout
    if (isElegant) {
      return null;
    }

    // For other themes
    return (
      <div
        className={
          isMinimal
            ? "" // For Minimal, we'll apply the grid layout at the parent level
            : cn(theme.layout.content, "grid grid-cols-1 gap-6") // For others, use theme styling plus grid
        }
      >
        {selectedRepos.map((repo, index) => (
          <Card
            key={repo.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              theme.preview.card,
              isMinimal ? "mb-2" : "mb-4", // Reduce spacing for Minimal theme
              isModern ? "shadow-lg hover:shadow-xl transition-shadow" : "",
              draggedIndex === index ? "opacity-50" : "",
              dragOverIndex === index ? "border-blue-500 border-2" : "",
              "cursor-move relative group"
            )}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2 flex-1">
                  <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-grab active:cursor-grabbing" />
                  <div className="relative group flex-1">
                  {editingRepoTitle === repo.id ? (
                    <div className="space-y-2">
                      <Input
                        value={tempRepoTitle}
                        onChange={(e) => setTempRepoTitle(e.target.value)}
                        className="text-2xl font-semibold"
                        placeholder="Enter repository title..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveRepoTitle}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2
                        className={cn("text-2xl font-semibold", theme.preview.text)}
                      >
                        {repo.displayName || repo.name}
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => startEditingRepoTitle(repo.id, repo.displayName || repo.name)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {repo.metadata.stars > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center">
                      ★ {repo.metadata.stars}
                    </span>
                  )}
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
                <div className="relative group">
                  {editingRepo === repo.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={tempRepoSummary}
                        onChange={(e) => setTempRepoSummary(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Enter repository summary..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveRepoSummary}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn("mb-4", theme.preview.text)}>
                        {repo.summary}
                      </p>
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingRepo(repo.id, repo.summary || "")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {repo.summary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRepoSummary(repo.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
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
                </div>
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
    // Track current theme for conditional styling
    const isMinimal = selectedTheme === "minimal";
    const isElegant = selectedTheme === "elegant";
    const isModern = selectedTheme === "modern";

    // Create the profile content
    return (
      <div
        className={
          isMinimal
            ? "sticky top-8 flex flex-col items-center" // Simplified for Minimal, as we set the container above
            : isElegant
              ? "flex flex-col items-center w-full" // Center everything for Elegant theme
              : cn(theme.layout.header, "flex flex-col") // Use theme styling for other themes
        }
      >
        {userInfo && (
          <>
            <div className="relative group mb-6">
              <Avatar className="w-32 h-32">
                <AvatarImage
                  src={userIntro?.customImageUrl || userInfo.avatarUrl || undefined}
                  alt={userInfo.username}
                  onError={(e) => {
                    // Fallback to GitHub avatar if custom URL fails
                    if (userIntro?.customImageUrl && e.currentTarget.src !== userInfo.avatarUrl) {
                      e.currentTarget.src = userInfo.avatarUrl || '';
                    }
                  }}
                />
                <AvatarFallback>
                  {userInfo.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={startEditingImage}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            {/* Image URL Editor */}
            {editingImage && (
              <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-2">Edit Profile Image</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter a custom image URL or leave empty to use your GitHub avatar
                </p>
                <div className="space-y-4">
                  <Input
                    type="url"
                    placeholder="https://example.com/your-image.jpg"
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={saveImageUrl}>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="relative group">
              {editingTitle ? (
                <div className="space-y-2">
                  <Input
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="text-center text-4xl font-bold"
                    placeholder="Enter portfolio title..."
                  />
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={saveTitle}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className={cn("text-4xl font-bold mb-6", theme.preview.text)}>
                    {customTitle || `${capitalizeFirstLetter(userInfo.username)}'s Portfolio`}
                  </h1>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={startEditingTitle}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {userIntro && (
          <div
            className={cn(
              "space-y-6",
              isMinimal ? "text-left" : "text-center",
              isElegant ? "max-w-3xl mx-auto" : "", // Add max width for Elegant theme
            )}
          >
            <div className="relative group">
              {editingIntro ? (
                <div className="space-y-2">
                  <Textarea
                    value={tempIntro}
                    onChange={(e) => setTempIntro(e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Enter your introduction..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveIntro}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={cn("leading-relaxed", theme.preview.text)}>
                    {userIntro.introduction}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={startEditingIntro}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="relative group">
              {editingSkills ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {tempSkills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800"
                      >
                        <span>{skill}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => removeSkill(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add new skill..."
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={addSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveSkills}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "flex flex-wrap gap-2",
                      isMinimal ? "" : "justify-center",
                    )}
                  >
                    {userIntro.skills.map((skill, index) => (
                      <span
                        key={index}
                        className={
                          isModern
                            ? "px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                            : isElegant
                              ? "px-3 py-1 rounded-full text-sm font-medium bg-stone-900 text-stone-50" // Special styling for Elegant
                              : "px-3 py-1 rounded-full text-sm font-medium bg-slate-800 text-white" // Default for Minimal
                        }
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={startEditingSkills}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="relative group">
              {editingInterests ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {tempInterests.map((interest, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-gray-200 text-gray-800"
                      >
                        <span>{interest}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => removeInterest(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add new interest..."
                      onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={addInterest}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveInterests}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={cn("text-sm", theme.preview.text)}>
                    <span className="font-medium">Interests:</span>{" "}
                    {userIntro.interests.join(", ")}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={startEditingInterests}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        theme.preview.background,
        selectedTheme === "elegant" ? "bg-stone-50" : "",
      )}
    >
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

          {/* Simple Editing Hint */}
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              💡 Tip: Your portfolio is fully customizable! Hover over elements to edit, drag repositories to reorder, or delete summaries
            </p>
          </div>

          {/* For specific themes, use explicit grid layouts */}
          {selectedTheme === "minimal" ? (
            // Minimal theme layout - 2 columns with left sidebar
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 flex justify-center">
                {renderProfile()}
              </div>
              <div className="lg:col-span-8">{renderPortfolioContent()}</div>
            </div>
          ) : selectedTheme === "elegant" ? (
            // Elegant theme layout - grid layout with repos side by side
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-center text-center mb-16 max-w-3xl">
                {renderProfile()}
              </div>
              <div className="w-full max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedRepos.map((repo, index) => (
                    <Card
                      key={repo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "border-l-4 border-stone-900 rounded-none shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] bg-white h-full cursor-move relative group",
                        draggedIndex === index ? "opacity-50" : "",
                        dragOverIndex === index ? "border-blue-500 border-2" : ""
                      )}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-2 flex-1">
                            <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-grab active:cursor-grabbing" />
                            <div className="relative group flex-1">
                            {editingRepoTitle === repo.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={tempRepoTitle}
                                  onChange={(e) => setTempRepoTitle(e.target.value)}
                                  className="text-2xl font-semibold"
                                  placeholder="Enter repository title..."
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveRepoTitle}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h2
                                  className={cn(
                                    "text-2xl font-semibold",
                                    theme.preview.text,
                                  )}
                                >
                                  {repo.displayName || repo.name}
                                </h2>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startEditingRepoTitle(repo.id, repo.displayName || repo.name)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                           </div>
                         </div>
                         <div className="flex items-center gap-2 ml-2">
                            {repo.metadata.stars > 0 && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center">
                                ★ {repo.metadata.stars}
                              </span>
                            )}
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
                        <div className="relative group">
                          {editingRepo === repo.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={tempRepoSummary}
                                onChange={(e) => setTempRepoSummary(e.target.value)}
                                className="min-h-[100px]"
                                placeholder="Enter repository summary..."
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveRepoSummary}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={cn("mb-4", theme.preview.text)}>
                                {repo.summary || repo.description}
                              </p>
                              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditingRepo(repo.id, repo.summary || repo.description || "")}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {(repo.summary || repo.description) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteRepoSummary(repo.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                          {repo.metadata.topics &&
                            repo.metadata.topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {repo.metadata.topics.map((topic) => (
                                  <Badge
                                    key={topic}
                                    variant="outline"
                                    className="bg-stone-900 text-stone-50"
                                  >
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
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
            customTitle={customTitle}
          />
        </div>
      </div>
    </div>
  );
}
