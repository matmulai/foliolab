import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenAIKey: (key: string) => void;
  onClose: () => void;
}

export function ApiKeyDialog({ open, onOpenAIKey, onClose }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim().startsWith("sk-")) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key starting with 'sk-'",
        variant: "destructive",
      });
      return;
    }
    onOpenAIKey(apiKey.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter OpenAI API Key</DialogTitle>
          <DialogDescription>
            Your API key is required to generate AI-powered summaries for your
            repositories. The key will be stored in your browser and only used for
            generating repository descriptions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
