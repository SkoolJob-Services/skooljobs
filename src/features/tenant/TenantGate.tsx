import type { ReactNode } from "react";
import { Button, CircularProgress } from "@cloudstrytech/ui-components";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { useTenant } from "./TenantContext";

/** Holds the app until /tenants/current resolves; shows a full-page error on failure. */
export function TenantGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useTenant();

  if (status === "loading") {
    return (
      <div className="page-center" role="status">
        <CircularProgress indeterminate aria-label="Loading" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Organisation unavailable" subtitle={error ?? undefined} showBranding={false}>
        <Button variant="outlined" onClick={retry} fullWidth>
          Try again
        </Button>
      </AuthLayout>
    );
  }

  return <>{children}</>;
}
