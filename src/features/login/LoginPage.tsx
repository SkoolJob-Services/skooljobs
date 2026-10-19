import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Input } from "@cloudstrytech/ui-components";
import { authApi } from "../../api";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { normalizeIdentifier } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { statusOf } from "../../api/errors";
import { useFlow } from "../FlowContext";
import { useTenant } from "../tenant/TenantContext";

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
  const { signupAllowed } = useTenant();

  const [identifier, setIdentifier] = useState(state.identifier ?? pendingLogin?.identifier ?? "");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    setFormError(null);
    setNotFound(false);

    const normalized = normalizeIdentifier(identifier);
    if (!normalized) {
      setFieldError(identifier.trim() ? "Enter a valid email address or phone number." : "Enter your email or phone number.");
      return;
    }
    setFieldError(undefined);

    setSubmitting(true);
    try {
      const { sessionId } = await authApi.requestLoginOtp({ identifier: normalized.value });
      setPendingLogin({ identifier: normalized.value, sessionId, returnTo: state.from });
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
      subtitle="We'll send a one-time code to your registered email or phone."
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
        <Input
          label="Email or phone number"
          name="identifier"
          value={identifier}
          onChange={(value: string) => {
            setIdentifier(value);
            if (fieldError) setFieldError(undefined);
          }}
          autoComplete="username"
          placeholder="john.doe@example.com or +919876543210"
          error={fieldError}
          supportingText="Phone numbers without a country code use your default country."
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
