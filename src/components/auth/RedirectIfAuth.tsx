import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Route guard that redirects authenticated users away from public pages.
 *
 * - While the auth state is bootstrapping, shows a centered spinner.
 * - If the user IS authenticated, redirects to /.
 * - If not authenticated, renders the child routes via <Outlet />.
 */
export function RedirectIfAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
