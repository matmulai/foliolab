import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Theme {
  id: string;
  name: string;
  description: string;
  className: string;
  preview: {
    background: string;
    text: string;
    accent: string;
    card: string;
    border: string;
  };
}

export const themes: Theme[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and minimal design with emphasis on content",
    className: "theme-minimal",
    preview: {
      background: "bg-white",
      text: "text-gray-900",
      accent: "bg-gray-100",
      card: "bg-white border border-gray-200",
      border: "border-gray-200",
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with subtle gradients",
    className: "theme-modern",
    preview: {
      background: "bg-gradient-to-br from-gray-50 to-gray-100",
      text: "text-gray-900",
      accent: "bg-primary/10",
      card: "bg-white shadow-md",
      border: "border-gray-200",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated design with dark accents",
    className: "theme-elegant",
    preview: {
      background: "bg-slate-50",
      text: "text-slate-900",
      accent: "bg-slate-800 text-white",
      card: "bg-white shadow-xl border border-slate-200",
      border: "border-slate-200",
    },
  },
];

interface ThemeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ThemeSelector({ value, onValueChange }: ThemeSelectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              <span className="flex items-center gap-2">
                {theme.name}
                {value === theme.id && <Check className="h-4 w-4" />}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <button
            key={theme.id}
            className={cn(
              "p-4 rounded-lg border-2 transition-all",
              value === theme.id
                ? "border-primary"
                : "border-transparent hover:border-primary/50"
            )}
            onClick={() => onValueChange(theme.id)}
          >
            <div className={cn("rounded-md p-3", theme.preview.background)}>
              <div className="space-y-2">
                <div className={cn("h-2 w-16 rounded", theme.preview.accent)} />
                <div className={cn("h-2 w-12 rounded", theme.preview.text)} />
              </div>
            </div>
            <div className="mt-2 text-sm font-medium">{theme.name}</div>
            <div className="text-xs text-muted-foreground">
              {theme.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
