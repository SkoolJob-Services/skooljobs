import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { AppRole } from "./roles";

/** Only for logged-in users; others go to /login and come back afterwards. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/**
 * Area for some roles only (layout route). Not logged in → /login;
 * logged in with another role → that user's own home page.
 */
export function RoleRoute({ roles }: { roles: AppRole[] }) {
  const { isAuthenticated, role, homePath } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!roles.includes(role)) return <Navigate to={homePath} replace />;
  return <Outlet />;
}

/** "/" — logged-in users go to their area, visitors to /login. */
export function HomeRedirect() {
  const { isAuthenticated, homePath } = useAuth();
  return <Navigate to={isAuthenticated ? homePath : "/login"} replace />;
}

/** Only for logged-out users (login, signup, invite); logged-in users go to their area. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, homePath } = useAuth();
  if (isAuthenticated) return <Navigate to={homePath} replace />;
  return <>{children}</>;
}
