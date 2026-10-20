import type { ReactNode } from "react";
import { SnackbarProvider } from "@cloudstrytech/ui-components";
import { AuthProvider } from "../features/auth/AuthContext";
import { FlowProvider } from "../features/FlowContext";
import { TenantProvider } from "../features/tenant/TenantContext";

/**
 * App-wide state, same order as cattlemgmtapp: snackbar → tenant (GET /tenants/current)
 * → auth session → in-progress OTP flows. Rendered inside <BrowserRouter>.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider position="bottom-center">
      <TenantProvider>
        <AuthProvider>
          <FlowProvider>{children}</FlowProvider>
        </AuthProvider>
      </TenantProvider>
    </SnackbarProvider>
  );
}
