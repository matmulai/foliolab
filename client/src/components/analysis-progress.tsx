import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  open: boolean;
  totalRepos: number;
  currentRepo: number;
  repoName?: string;
  progress: number;
}

export function AnalysisProgress({
  open,
  totalRepos,
  currentRepo,
  repoName,
  progress,
}: AnalysisProgressProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-6 p-2">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Analyzing Repositories</h3>
            <p className="text-sm text-muted-foreground">
              Generating AI summaries for your repositories. This may take a few moments...
            </p>
          </div>

          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Processing repository {currentRepo} of {totalRepos}
              </p>
              {repoName && (
                <p className="font-medium text-foreground">
                  Currently analyzing: {repoName}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
