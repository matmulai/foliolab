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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenAIKey: (key: string | undefined, customPrompt?: string) => void;
  onClose: () => void;
}

const DEFAULT_PROMPT = `Generate a concise project summary and key features list from the repository information. Keep the summary under 150 words and limit key features to 3-5 bullet points.`;

type ModelType = 'openrouter' | 'openai';

export function ApiKeyDialog({ open, onOpenAIKey, onClose }: ApiKeyDialogProps) {
  const [selectedModel, setSelectedModel] = useState<ModelType>('openrouter');
  const [apiKey, setApiKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const savedKey = localStorage.getItem("openai_api_key");
      const savedPrompt = localStorage.getItem("openai_custom_prompt");
      if (savedKey) {
        setApiKey(savedKey);
        setSelectedModel('openai');
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

    if (selectedModel === 'openai') {
      if (!apiKey.trim().startsWith("sk-")) {
        toast({
          title: "Invalid API Key",
          description: "Please enter a valid OpenAI API key starting with 'sk-'",
          variant: "destructive",
        });
        return;
      }
      localStorage.setItem("openai_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("openai_api_key");
    }

    if (customPrompt.trim() !== DEFAULT_PROMPT) {
      localStorage.setItem("openai_custom_prompt", customPrompt.trim());
    } else {
      localStorage.removeItem("openai_custom_prompt");
    }

    onOpenAIKey(
      selectedModel === 'openai' ? apiKey.trim() : undefined,
      customPrompt.trim() === DEFAULT_PROMPT ? undefined : customPrompt.trim()
    );
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
          <DialogTitle>Choose AI Model</DialogTitle>
          <DialogDescription>
            Select which AI model to use for generating repository summaries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup
            value={selectedModel}
            onValueChange={(value) => setSelectedModel(value as ModelType)}
            className="grid gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="openrouter" id="openrouter" />
              <Label htmlFor="openrouter">Use OpenRouter AI (Free)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="openai" id="openai" />
              <Label htmlFor="openai">Use OpenAI (Better Results)</Label>
            </div>
          </RadioGroup>

          {selectedModel === 'openai' && (
            <>
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  OpenAI provides higher quality results but requires your own API key.
                </AlertDescription>
              </Alert>
              <Input
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
            </>
          )}

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