import type { JSX, ReactNode } from "react";

/** Types for the JavaScript component Authlayout.jsx (used from the TypeScript auth pages). */
declare function AuthLayout(props: {
  children?: ReactNode;
  title?: ReactNode;
  activeTab?: "combined" | "candidate" | "employer";
  onTabChange?: (tab: "candidate" | "employer") => void;
}): JSX.Element;

export default AuthLayout;
