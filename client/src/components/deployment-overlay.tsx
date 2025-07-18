import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeploymentOverlayProps {
  open: boolean;
  onClose: () => void;
  deploymentUrl: string;
  portfolioUrl: string;
  username: string;
}

export function DeploymentOverlay({
  open,
  onClose,
  deploymentUrl,
  portfolioUrl,
  username
}: DeploymentOverlayProps) {
  const [countdown, setCountdown] = useState(60);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (open && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open, countdown]);

  useEffect(() => {
    const checkCustomDomain = async () => {
      try {
        // Check for CNAME in the repository
        const res = await fetch(`https://api.github.com/repos/${username}/${username}.github.io/contents/CNAME`);
        if (res.ok) {
          const data = await res.json();
          const domain = atob(data.content.trim());
          setCustomDomain(domain);
        }
      } catch (error) {
        // No custom domain configured
      }
    };

    if (open) {
      checkCustomDomain();
    }
  }, [username, open]);

  const handleViewPortfolio = () => {
    const finalUrl = customDomain 
      ? `https://${customDomain}/portfolio.html`
      : portfolioUrl;
    window.open(finalUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-4 p-2">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <h3 className="text-lg font-semibold">Deploying to GitHub Pages</h3>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Your portfolio has been committed to:</p>
            <p className="bg-muted p-2 rounded-md font-mono text-xs break-all">
              {deploymentUrl}
            </p>
            
            {customDomain ? (
              <>
                <p>Your portfolio will be available at:</p>
                <p className="bg-muted p-2 rounded-md font-mono text-xs">
                  https://{customDomain}/portfolio.html
                </p>
              </>
            ) : (
              <>
                <p>Your portfolio will be available at:</p>
                <p className="bg-muted p-2 rounded-md font-mono text-xs">
                  {portfolioUrl}
                </p>
              </>
            )}

            <p className="mt-4">
              GitHub Pages may take a few moments to update. You can view your portfolio in:
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              onClick={handleViewPortfolio}
              disabled={countdown > 0}
            >
              View Portfolio {countdown > 0 && `(${countdown}s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
