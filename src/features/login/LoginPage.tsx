import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Input } from "@cloudstrytech/ui-components";
import { authApi } from "../../api";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { DEFAULT_COUNTRY_CODE, normalizeIdentifier } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { statusOf } from "../../api/errors";
import { useFlow } from "../FlowContext";
import { useTenant } from "../tenant/TenantContext";
import { CHANNEL_LABEL, initialLoginChannel, loginChannelFlags, type Channel } from "../tenant/otpChannels";
import { useAuth } from "../auth/AuthContext";
import { findLocalAccount, localLogin, writeLocalProfile } from "../auth/localAccounts";
import { ROLE_HOME } from "../auth/roles";

interface LocationState {
  from?: string;
  identifier?: string;
  notice?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { pendingLogin, setPendingLogin } = useFlow();
  const { signupAllowed, channels } = useTenant();
  const enabled = channels.login;
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState(state.identifier ?? pendingLogin?.identifier ?? "");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chosen, setChosen] = useState<Channel | undefined>(() =>
    initialLoginChannel(enabled, state.identifier ?? pendingLogin?.identifier, pendingLogin?.channel),
  );
  // The tenant's list may arrive after the first render, or change: keep a valid choice.
  const channel = chosen && enabled.includes(chosen) ? chosen : initialLoginChannel(enabled, identifier);
  const byEmail = channel === "EMAIL";

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    setFormError(null);
    setNotFound(false);

    // Head Admin / school HR / platform admin can't log in via the backend yet — log in locally without OTP,
    // whichever channel is selected.
    const local = normalizeIdentifier(identifier);
    const localAccount = local ? findLocalAccount(local.value) : undefined;
    if (local && localAccount) {
      setFieldError(undefined);
      signIn(localLogin(localAccount), local.value);
      writeLocalProfile(localAccount);
      navigate(ROLE_HOME[localAccount.role], { replace: true });
      return;
    }

    if (!channel) {
      setFormError("Login isn't available for this organisation right now. Please contact them.");
      return;
    }
    const normalized = normalizeIdentifier(identifier);
    const wanted = byEmail ? "email" : "phone";
    if (!normalized || normalized.kind !== wanted) {
      setFieldError(
        !identifier.trim()
          ? byEmail
            ? "Enter your email address."
            : `Enter your ${channel === "WHATSAPP" ? "WhatsApp" : "mobile"} number.`
          : byEmail
            ? "Enter a valid email address."
            : `Enter a valid ${channel === "WHATSAPP" ? "WhatsApp" : "mobile"} number.`,
      );
      return;
    }
    setFieldError(undefined);

    setSubmitting(true);
    try {
      const { sessionId } = await authApi.requestLoginOtp({ identifier: normalized.value, ...loginChannelFlags(channel) });
      setPendingLogin({ identifier: normalized.value, sessionId, channel, returnTo: state.from });
      navigate("/login/verify");
    } catch (error) {
      setFormError(errorMessage(error, "loginRequest"));
      setNotFound(statusOf(error) === 404);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle={
        enabled.length === 1
          ? `We'll send a one-time code by ${CHANNEL_LABEL[enabled[0]]}.`
          : "Choose how to receive your one-time code."
      }
      step="Step 1 of 2"
      footer={
        <>
          {signupAllowed && (
            <p>
              New here? <Link to="/signup">Create an account</Link>
            </p>
          )}
          <p>Schools join SkoolJobs through an invite from their administrator.</p>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert message={state.notice} tone="success" />
        {enabled.length > 1 && (
          <div className="segmented" role="radiogroup" aria-label="Send the code by">
            {enabled.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={channel === c}
                className={`segmented__option${channel === c ? " is-selected" : ""}`}
                onClick={() => {
                  setChosen(c);
                  setFieldError(undefined);
                  setFormError(null);
                  setNotFound(false);
                }}
                disabled={submitting}
              >
                {CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>
        )}
        <Input
          label={byEmail ? "Email address" : channel === "WHATSAPP" ? "WhatsApp number" : "Mobile number"}
          name="identifier"
          value={identifier}
          onChange={(value: string) => {
            setIdentifier(value);
            if (fieldError) setFieldError(undefined);
          }}
          type={byEmail ? "email" : "tel"}
          autoComplete={byEmail ? "email" : "tel"}
          placeholder={byEmail ? "john.doe@example.com" : "98765 43210 or +919876543210"}
          error={fieldError}
          supportingText={
            byEmail
              ? "The email address you signed up with."
              : `Numbers without a country code use ${DEFAULT_COUNTRY_CODE}.${
                  channel === "WHATSAPP" ? " Your WhatsApp number, or your phone number if you didn't give one." : ""
                }`
          }
          required
          disabled={submitting}
        />
        <FormAlert message={formError} />
        {notFound && signupAllowed && (
          <p className="inline-hint">
            <Link to="/signup">Sign up instead</Link>
          </p>
        )}
        <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting}>
          Send code
        </Button>
      </form>
    </AuthLayout>
  );
}
