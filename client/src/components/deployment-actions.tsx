import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Loader2, Github, Download, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DeploymentOverlay } from "./deployment-overlay";
import { VercelDeploymentOverlay } from "./vercel-deployment-overlay";
import { Repository } from "@shared/schema";

interface DeploymentActionsProps {
  onSuccess?: () => void;
  repositories: Repository[];
}

export function DeploymentActions({
  onSuccess,
  repositories,
}: DeploymentActionsProps) {
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [isDeployingToPages, setIsDeployingToPages] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showVercelDeployment, setShowVercelDeployment] = useState(false);
  const [showDeploymentOverlay, setShowDeploymentOverlay] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState<{
    deploymentUrl: string;
    portfolioUrl: string;
    username: string;
  } | null>(null);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const res = await apiRequest("POST", "/api/deploy/github", {
        accessToken: localStorage.getItem("github_token"),
        downloadOnly: true,
        repositories,
      });

      if (!res.ok) {
        throw new Error("Failed to generate portfolio");
      }

      const data = await res.json();

      // Create a blob from the HTML content
      const blob = new Blob([data.html], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "portfolio.html";
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

  const handleDeployToPages = async () => {
    try {
      setIsDeployingToPages(true);
      const res = await apiRequest("POST", "/api/deploy/github-pages", {
        accessToken: localStorage.getItem("github_token"),
        repositories,
      });

      if (!res.ok) {
        throw new Error("Failed to deploy to GitHub Pages");
      }

      const data = await res.json();

      if (data.success) {
        const username = localStorage.getItem("github_username");
        if (!username) throw new Error("GitHub username not found");

        setDeploymentInfo({
          deploymentUrl: `https://github.com/${username}/${username}.github.io/blob/main/portfolio.html`,
          portfolioUrl: `https://${username}.github.io/portfolio.html`,
          username,
        });
        setShowDeploymentOverlay(true);
      }

      toast({
        title: data.wasCreated
          ? "GitHub Pages Created"
          : "GitHub Pages Updated",
        description: data.message,
      });
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

  const handleVercelDeploy = async () => {
    try {
      setIsCreatingRepo(true);

      // First, get Vercel OAuth token
      const authResponse = await apiRequest("POST", "/api/deploy/vercel/auth", {
        code: "VERCEL_AUTH_CODE" // This will need to be obtained via OAuth flow
      });

      if (!authResponse.ok) {
        throw new Error("Failed to authenticate with Vercel");
      }

      const authData = await authResponse.json();
      const username = localStorage.getItem("github_username");
      if (!username) throw new Error("GitHub username not found");

      // Deploy to Vercel
      const deployResponse = await apiRequest("POST", "/api/deploy/vercel", {
        accessToken: authData.accessToken,
        teamId: authData.teamId,
        username,
        repositories,
      });

      if (!deployResponse.ok) {
        throw new Error("Failed to deploy to Vercel");
      }

      const deployData = await deployResponse.json();
      setShowVercelDeployment(true);

      // Start checking deployment status
      const checkStatus = async () => {
        const statusResponse = await apiRequest("GET", `/api/deploy/vercel/status/${deployData.deploymentId}?accessToken=${authData.accessToken}`);
        const statusData = await statusResponse.json();

        if (statusData.ready) {
          toast({
            title: "Deployment Complete",
            description: "Your portfolio has been deployed to Vercel successfully!",
          });
          if (onSuccess) onSuccess();
        }
      };

      // Check status every 5 seconds
      const interval = setInterval(checkStatus, 5000);
      setTimeout(() => clearInterval(interval), 60000); // Stop checking after 1 minute

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy to Vercel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRepo(false);
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
        onClick={handleVercelDeploy}
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

      {deploymentInfo && (
        <DeploymentOverlay
          open={showDeploymentOverlay}
          onClose={() => setShowDeploymentOverlay(false)}
          deploymentUrl={deploymentInfo.deploymentUrl}
          portfolioUrl={deploymentInfo.portfolioUrl}
          username={deploymentInfo.username}
        />
      )}

      {showVercelDeployment && (
        <VercelDeploymentOverlay
          open={showVercelDeployment}
          onClose={() => setShowVercelDeployment(false)}
          username={localStorage.getItem("github_username") || ""}
        />
      )}
    </div>
  );
}