import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import DataSourcesPage from "@/pages/data-sources";
import DataWizard from "@/pages/data-wizard";
import GithubAuth from "@/pages/github-auth";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import PortfolioPreview from "@/pages/portfolio-preview";
import RepoSelect from "@/pages/repo-select";
import SelectItems from "@/pages/select-items";
import SourceSelection from "@/pages/source-selection";
import { queryClient } from "./lib/queryClient";

function Router() {
  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth/github" component={GithubAuth} />
        <Route path="/repos" component={RepoSelect} />
        <Route path="/select-sources" component={SourceSelection} />
        <Route path="/wizard" component={DataWizard} />
        <Route path="/select-items" component={SelectItems} />
        <Route path="/preview" component={PortfolioPreview} />
        <Route path="/data-sources" component={DataSourcesPage} />
        <Route component={NotFound} />
      </Switch>
    </>
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
