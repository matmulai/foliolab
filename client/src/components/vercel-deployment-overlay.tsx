import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VercelDeploymentOverlayProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export function VercelDeploymentOverlay({
  open,
  onClose,
  username
}: VercelDeploymentOverlayProps) {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState<'initializing' | 'deploying' | 'complete' | 'error'>('initializing');
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const checkDeployment = async () => {
      try {
        // Get the deployment URL from localStorage (set during deployment initiation)
        const url = localStorage.getItem('vercel_deployment_url');
        if (url) {
          setDeploymentUrl(url);
          setDeploymentStatus('deploying');
          setDeploymentProgress(30); // Initial progress after URL is set
        }

        // Start polling GitHub repository status
        let retries = 0;
        const maxRetries = 30; // 5 minutes maximum
        const interval = setInterval(async () => {
          try {
            if (retries >= maxRetries) {
              clearInterval(interval);
              throw new Error("Deployment timed out");
            }

            // Check if the site is accessible
            const response = await fetch(url!, { method: 'HEAD' });
            if (response.ok) {
              setDeploymentStatus('complete');
              setDeploymentProgress(100);
              clearInterval(interval);
              toast({
                title: "Deployment Complete",
                description: "Your portfolio has been successfully deployed to Vercel!",
              });
            } else {
              retries++;
              setDeploymentProgress(Math.min(90, 30 + (retries * 2))); // Gradually increase progress
            }
          } catch (error) {
            // If we can't access the site yet, it's still deploying
            retries++;
            setDeploymentProgress(Math.min(90, 30 + (retries * 2))); // Gradually increase progress
          }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Deployment check error:', error);
        setDeploymentStatus('error');
        toast({
          title: "Deployment Error",
          description: error instanceof Error ? error.message : "Failed to check deployment status",
          variant: "destructive",
        });
      }
    };

    checkDeployment();
  }, [open, toast]);

  const handleViewDeployment = () => {
    if (deploymentUrl) {
      window.open(deploymentUrl, '_blank');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-6 p-2">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Deploying to Vercel</h3>
            <p className="text-sm text-muted-foreground">
              {deploymentStatus === 'initializing' && "Setting up deployment..."}
              {deploymentStatus === 'deploying' && "Building and deploying your portfolio..."}
              {deploymentStatus === 'complete' && "Deployment complete!"}
              {deploymentStatus === 'error' && "Deployment failed. Please try again."}
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={deploymentProgress} className="h-2" />

            <div className="text-sm text-muted-foreground space-y-1">
              {deploymentStatus !== 'error' && (
                <p>Deploying to: {`${username}-foliolab.vercel.app`}</p>
              )}
              {deploymentUrl && deploymentStatus === 'complete' && (
                <p className="font-medium text-foreground">
                  Your portfolio is live at: {deploymentUrl}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={deploymentStatus === 'deploying'}
            >
              {deploymentStatus === 'deploying' ? 'Deploying...' : 'Close'}
            </Button>
            {deploymentUrl && deploymentStatus === 'complete' && (
              <Button
                onClick={handleViewDeployment}
                className="gap-2"
              >
                View Deployment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}