import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Github, Shield, Globe, FileQuestion, Mail, Info } from "lucide-react";
import { clearAllData } from "@/lib/queryClient";
import { clearStorage } from "@/lib/storage";
import { useEffect } from "react";

export default function Home() {
  // Clear all data when the component mounts
  useEffect(() => {
    clearStorage(); // Clear local storage data
    clearAllData(); // Clear query cache
  }, []);

  // Add clearAllData to the GitHub auth button click
  const handleStartClick = () => {
    clearAllData(); // Clear all data before starting new auth
    clearStorage(); // Clear local storage as well
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Create Your Developer Portfolio in Minutes
            </h1>
            <p className="text-lg text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Turn your GitHub repositories into a beautiful portfolio website powered by AI
            </p>

            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="grid gap-6">
                  <Button
                    asChild
                    size="lg"
                    className="w-full hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleStartClick}
                  >
                    <Link href="/auth/github" className="flex items-center justify-center gap-2">
                      <Github className="w-5 h-5" />
                      Build My Portfolio with GitHub
                    </Link>
                  </Button>
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span>Other sources like GitLab, BitBucket will be coming soon.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-3 mt-20">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Select Repositories</h3>
                <p className="text-muted-foreground">
                  Choose which projects you want to showcase in your portfolio
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">AI-Powered Summaries</h3>
                <p className="text-muted-foreground">
                  Get intelligent project descriptions generated from your repositories
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Beautiful Design</h3>
                <p className="text-muted-foreground">
                  Your portfolio will look professional and polished automatically
                </p>
              </div>
            </div>

            {/* FAQs Section */}
            <div className="mt-20">
              <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
              <div className="grid gap-6 text-left">
                <div>
                  <h3 className="font-semibold mb-2">How does it work?</h3>
                  <p className="text-muted-foreground">
                    Connect your GitHub account, select the repositories you want to showcase,
                    and we'll generate beautiful summaries using AI. Deploy your portfolio
                    with one click to GitHub Pages or Vercel.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Is it free to use?</h3>
                  <p className="text-muted-foreground">
                    FolioLab is open-source and free to use. 
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">What data do you collect?</h3>
                  <p className="text-muted-foreground">
                    We don't store any of your data.
                  </p>
                </div>
              </div>
            </div>

            <Card className="mt-12 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 mt-1 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold mb-2">Privacy First</h3>
                    <p className="text-sm text-muted-foreground">
                      Your data stays private. We only use your GitHub access to read repositories.
                      No data is stored on our servers, everything is processed client-side.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md shadow-sm py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
            </div>
            <div className="flex items-center gap-8">
              <a
                href="https://github.com/matmulai/foliolab"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a
                href="https://github.com/matmulai/foliolab/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                <FileQuestion className="h-4 w-4" />
                FAQs
              </a>
              <a
                href="https://github.com/matmulai/foliolab"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                <Mail className="h-4 w-4" />
                Contact Developers
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Made with ❤️ by the{" "}
              <a
                href="https://github.com/matmulai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MatMul AI
              </a>{" "}
              team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}