import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function getGithubAuthUrl() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("GitHub Client ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/github`,
    scope: 'repo,read:user',
    state: crypto.randomUUID(),
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}

export default function GithubAuth() {
  const [, setLocation] = useLocation();

  const { mutate: authenticate, isPending } = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/fetch-repos", { code });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`${res.status}: ${JSON.stringify(errorData)}`);
      }
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
    onError: (error) => {
      console.error("Authentication error:", error);
    }
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    if (error) {
      console.error("GitHub OAuth Error:", error, errorDescription);
      return;
    }

    if (code) {
      authenticate(code);
    } else {
      window.location.href = getGithubAuthUrl();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-4 animate-spin" />
            <p>Authenticating with GitHub...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}