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
  layout: {
    container: string;
    header: string;
    content: string;
    profile: string;
  };
}

export const themes: Theme[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and minimal design with left-aligned profile",
    className: "theme-minimal",
    preview: {
      background: "bg-white",
      text: "text-slate-800",
      accent: "bg-slate-800 text-white",
      card: "bg-white border-2 border-slate-100 hover:border-slate-200 transition-colors",
      border: "border-slate-200",
    },
    layout: {
      container: "grid grid-cols-1 lg:grid-cols-12 gap-8",
      header: "lg:col-span-4",
      content: "lg:col-span-8",
      profile: "sticky top-8",
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with gradients and floating cards",
    className: "theme-modern",
    preview: {
      background: "bg-gradient-to-br from-indigo-50 via-white to-purple-50",
      text: "text-gray-900",
      accent: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm",
      card: "bg-white/80 backdrop-blur-sm shadow-xl rounded-xl border border-white/20 hover:shadow-2xl transition-all",
      border: "border-white/20",
    },
    layout: {
      container: "max-w-4xl mx-auto",
      header: "text-center mb-16",
      content: "grid gap-8",
      profile: "",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated grid layout with bold typography",
    className: "theme-elegant",
    preview: {
      background: "bg-stone-50",
      text: "text-stone-900",
      accent: "bg-stone-900 text-stone-50",
      card: "bg-white shadow-[0_2px_40px_-12px_rgba(0,0,0,0.1)] rounded-none border-l-4 border-stone-900 hover:shadow-[0_2px_40px_-8px_rgba(0,0,0,0.15)] transition-all",
      border: "border-stone-200",
    },
    layout: {
      container: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12",
      header: "col-span-full",
      content: "col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
      profile: "flex flex-col items-start",
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
                <div className={cn("h-2 w-12 rounded bg-current", theme.preview.text)} />
                <div className={cn("h-8 w-full rounded", theme.preview.card)} />
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