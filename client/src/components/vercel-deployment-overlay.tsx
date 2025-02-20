import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (open && deploymentStatus === 'deploying') {
      interval = setInterval(() => {
        setDeploymentProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, deploymentStatus]);

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
                <p>Deploying to: {`${username}-folio.vercel.app`}</p>
              )}
              {deploymentUrl && (
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
            >
              Close
            </Button>
            {deploymentUrl && (
              <Button
                onClick={handleViewDeployment}
                className="gap-2"
              >
                {deploymentStatus === 'deploying' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                View Deployment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
