import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { InviteDetailsResponse, SignupSessionRequest } from "../api";
import type { OtpChannel, SignupFormValues } from "./signup/signupForm";

/**
 * State carried from step 1 to step 2 of each OTP flow. Kept in memory only,
 * so personal details never land in the URL or browser storage. A page
 * refresh on a verify screen sends the user back to step 1.
 */

export interface PendingSignup {
  request: SignupSessionRequest;
  channels: OtpChannel[];
  sessionId: string;
}

export interface PendingLogin {
  identifier: string;
  sessionId: string;
  /** Where to go after login. */
  returnTo?: string;
}

export interface PendingInvite {
  token: string;
  details: InviteDetailsResponse;
  firstName: string;
  lastName: string;
  sessionId: string;
}

interface FlowContextValue {
  /** Last signup form values, so "Edit details" or an expired session doesn't lose them. */
  signupDraft: SignupFormValues | null;
  setSignupDraft(values: SignupFormValues | null): void;
  pendingSignup: PendingSignup | null;
  setPendingSignup(value: PendingSignup | null): void;
  pendingLogin: PendingLogin | null;
  setPendingLogin(value: PendingLogin | null): void;
  pendingInvite: PendingInvite | null;
  setPendingInvite(value: PendingInvite | null): void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [signupDraft, setSignupDraft] = useState<SignupFormValues | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  const value = useMemo<FlowContextValue>(
    () => ({
      signupDraft,
      setSignupDraft,
      pendingSignup,
      setPendingSignup,
      pendingLogin,
      setPendingLogin,
      pendingInvite,
      setPendingInvite,
    }),
    [signupDraft, pendingSignup, pendingLogin, pendingInvite],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider>");
  return ctx;
}
