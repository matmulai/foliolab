import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenAIKey: (key: string, customPrompt?: string) => void;
  onClose: () => void;
}

const DEFAULT_PROMPT = `Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points.`;

export function ApiKeyDialog({ open, onOpenAIKey, onClose }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved API key and custom prompt from localStorage when dialog opens
    if (open) {
      const savedKey = localStorage.getItem("openai_api_key");
      const savedPrompt = localStorage.getItem("openai_custom_prompt");
      if (savedKey) {
        setApiKey(savedKey);
      }
      if (savedPrompt) {
        setCustomPrompt(savedPrompt);
        setShowAdvanced(true);
      } else {
        setCustomPrompt(DEFAULT_PROMPT);
      }
    }
  }, [open]);

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

    // Save API key and custom prompt to localStorage
    localStorage.setItem("openai_api_key", apiKey.trim());
    if (customPrompt.trim() !== DEFAULT_PROMPT) {
      localStorage.setItem("openai_custom_prompt", customPrompt.trim());
    } else {
      localStorage.removeItem("openai_custom_prompt");
    }

    onOpenAIKey(apiKey.trim(), customPrompt.trim() === DEFAULT_PROMPT ? undefined : customPrompt.trim());
    onClose();
  };

  const resetPrompt = () => {
    setCustomPrompt(DEFAULT_PROMPT);
    localStorage.removeItem("openai_custom_prompt");
    toast({
      title: "Prompt Reset",
      description: "The prompt has been reset to the default value.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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

          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Custom Prompt (Optional)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPrompt}
                    className="h-8 px-2"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="h-32"
                />
              </div>
            )}
          </div>

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