import { useEffect } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DashboardLayout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/Admin";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setAuthTokenGetter } from "@/lib/api-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 1;
      },
      retryDelay: 2_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Wire the stored JWT into every API fetch as Authorization: Bearer <token>
function TokenSyncer() {
  const { token } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(token ? () => token : null);
  }, [token]);

  // Clear react-query cache on sign-out
  useEffect(() => {
    if (!token) {
      qc.clear();
    }
  }, [token, qc]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return <Component />;
}

function HomeRedirect() {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Home />;
}

function AppRoutes() {
  return (
    <>
      <TokenSyncer />
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/sign-up" component={SignUp} />

        <Route path="/dashboard">
          <DashboardLayout>
            <ProtectedRoute component={Dashboard} />
          </DashboardLayout>
        </Route>

        <Route path="/admin" component={AdminDashboard} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </QueryClientProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}
