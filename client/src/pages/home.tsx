import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Github, Shield } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6">
            Create Your Developer Portfolio in Minutes
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Turn your GitHub repositories into a beautiful portfolio website powered by AI
          </p>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid gap-6">
                <Button
                  asChild
                  size="lg"
                  className="w-full"
                  onClick={handleStartClick}
                >
                  <Link href="/auth/github" className="flex items-center justify-center gap-2">
                    <Github className="w-5 h-5" />
                    Build My Portfolio with GitHub
                  </Link>
                </Button>
                <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>You'll need an OpenAI API key for AI-powered summaries</span>
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

          <Card className="mt-12 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 mt-1 text-primary" />
                <div className="text-left">
                  <h3 className="font-semibold mb-2">Privacy First</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data stays private. We only use your GitHub access to read repositories
                    and OpenAI API key for generating summaries. No data is stored on our servers,
                    everything is processed client-side.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}