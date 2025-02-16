import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function getGithubAuthUrl() {
  // Add verbose environment debugging
  console.log("Environment variables:", {
    VITE_GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV
  });

  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    console.error("GitHub Client ID is not defined in environment variables");
    throw new Error("GitHub Client ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/github`,
    scope: 'repo,read:user',
    state: crypto.randomUUID(),
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  console.log("Generated GitHub Auth URL:", authUrl);
  return authUrl;
}

export default function GithubAuth() {
  const [, setLocation] = useLocation();

  const { mutate: authenticate, isPending } = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/fetch-repos", { code });
      const data = await res.json();

      // Store GitHub token and username for later use
      if (data.accessToken) {
        localStorage.setItem("github_token", data.accessToken);
        localStorage.setItem("github_username", data.username);
      }

      return data;
    },
    onSuccess: () => {
      setLocation("/repos");
    },
  });

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      if (error) {
        console.error("GitHub OAuth Error:", error, errorDescription);
        return;
      }

      if (code) {
        console.log("Received GitHub code, authenticating...");
        authenticate(code);
      } else {
        console.log("No code present, redirecting to GitHub...");
        window.location.href = getGithubAuthUrl();
      }
    } catch (error) {
      console.error("Error during GitHub authentication:", error);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Authenticating with GitHub...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}