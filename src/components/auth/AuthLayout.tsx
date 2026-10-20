import type { ReactNode } from "react";
import SkoolJobsAuthLayout from "../Authlayout";

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** e.g. "Step 1 of 2" */
  step?: string;
  footer?: ReactNode;
  /** Kept for the shared page API; SkoolJobs always shows its own left panel. */
  showBranding?: boolean;
  /** Organisation name for the left panel, e.g. from an invite. */
  brandName?: string;
  brandLogoUrl?: string;
  /** Left-panel text: both audiences, teachers or schools. */
  audience?: "combined" | "candidate" | "employer";
  children: ReactNode;
}

/**
 * Screen frame for login, signup and invite pages: the SkoolJobs left panel
 * (components/Authlayout.jsx) and the form on the right. Same props as the
 * cattlemgmtapp AuthLayout, so the auth pages are identical in both apps.
 */
export function AuthLayout({
  title,
  subtitle,
  step,
  footer,
  brandName,
  audience = "combined",
  children,
}: AuthLayoutProps) {
  return (
    <SkoolJobsAuthLayout title={brandName ? `Join ${brandName}` : "Welcome to SkoolJobs"} activeTab={audience}>
      <div className="auth-panel">
        {step && <p className="auth-card__step">{step}</p>}
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </SkoolJobsAuthLayout>
  );
}
