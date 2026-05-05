import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import ImageGen from "@/pages/ImageGen";
import Weather from "@/pages/Weather";
import Wiki from "@/pages/Wiki";
import Healthcare from "@/pages/Healthcare";
import Study from "@/pages/Study";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/image" component={ImageGen} />
        <Route path="/weather" component={Weather} />
        <Route path="/wiki" component={Wiki} />
        <Route path="/healthcare" component={Healthcare} />
        <Route path="/study" component={Study} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
