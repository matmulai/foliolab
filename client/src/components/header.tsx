import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-white/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="FolioLab Logo" className="h-8 w-8 group-hover:scale-105 transition-transform" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary-foreground bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              FolioLab
            </span>
          </a>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          asChild
        >
          <a
            href="https://github.com/replit/FolioLab"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </Button>
      </div>
    </header>
  );
}