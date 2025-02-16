import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Github, Download, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeploymentActionsProps {
  onSuccess?: () => void;
}

export function DeploymentActions({ onSuccess }: DeploymentActionsProps) {
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isDeployingToPages, setIsDeployingToPages] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showVercelDialog, setShowVercelDialog] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const res = await apiRequest("POST", "/api/deploy/github", {
        accessToken: localStorage.getItem("github_token"),
        downloadOnly: true,
      });

      if (!res.ok) {
        throw new Error("Failed to generate portfolio");
      }

      const data = await res.json();

      // Create a blob from the HTML content
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio.html';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Portfolio Downloaded",
        description: "Your portfolio has been downloaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download portfolio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateRepo = async () => {
    try {
      setIsCreatingRepo(true);
      const res = await apiRequest("POST", "/api/deploy/github", {
        accessToken: localStorage.getItem("github_token"),
      });

      if (!res.ok) {
        throw new Error("Failed to create repository");
      }

      const data = await res.json();

      toast({
        title: data.wasCreated ? "Repository Created" : "Repository Updated",
        description: data.message,
      });

      // Show Vercel deployment dialog
      setShowVercelDialog(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create repository. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleDeployToPages = async () => {
    try {
      setIsDeployingToPages(true);
      const res = await apiRequest("POST", "/api/deploy/github-pages", {
        accessToken: localStorage.getItem("github_token"),
      });

      if (!res.ok) {
        throw new Error("Failed to deploy to GitHub Pages");
      }

      const data = await res.json();

      toast({
        title: data.wasCreated ? "GitHub Pages Created" : "GitHub Pages Updated",
        description: data.message,
      });

      // Open the GitHub Pages URL in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy to GitHub Pages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeployingToPages(false);
    }
  };

  return (
    <div className="mt-12 flex flex-wrap justify-center gap-4">
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download HTML
      </Button>

      <Button
        onClick={handleDeployToPages}
        disabled={isDeployingToPages}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isDeployingToPages ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
        Deploy to GitHub Pages
      </Button>

      <Button
        onClick={handleCreateRepo}
        disabled={isCreatingRepo}
        className="flex items-center gap-2"
      >
        {isCreatingRepo ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Github className="h-4 w-4" />
        )}
        Deploy to Vercel
      </Button>

      <Dialog open={showVercelDialog} onOpenChange={setShowVercelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy to Vercel</DialogTitle>
            <DialogDescription className="space-y-4">
              <p>
                Your portfolio repository has been {isCreatingRepo ? "created" : "updated"}. 
                To deploy with Vercel:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Click below to continue to Vercel</li>
                <li>In Vercel, select "Import Git Repository"</li>
                <li>Find and select "portfolio-showcase" from your GitHub repositories</li>
                <li>Click Deploy</li>
              </ol>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                const vercelDeployUrl = `https://vercel.com/new/git/external?repository=https://github.com/${localStorage.getItem("github_username")}/portfolio-showcase`;
                window.open(vercelDeployUrl, "_blank");
                setShowVercelDialog(false);
              }}
            >
              Continue to Vercel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}