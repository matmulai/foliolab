import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GithubAuth from "@/pages/github-auth";
import RepoSelect from "@/pages/repo-select";
import PortfolioPreview from "@/pages/portfolio-preview";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/github" component={GithubAuth} />
      <Route path="/repos" component={RepoSelect} />
      <Route path="/preview" component={PortfolioPreview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
