import { Link } from "wouter";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <a className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            FolioLab
          </a>
        </Link>
      </div>
    </header>
  );
}
