import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { authApi } from "../../api";
import { statusOf } from "../../api/errors";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { OtpField } from "../../components/auth/OtpField";
import { maskIdentifier } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { useAuth } from "../auth/AuthContext";
import { useFlow } from "../FlowContext";
import { OTP_PATTERN } from "../signup/signupForm";

export function LoginVerifyPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signIn } = useAuth();
  const { pendingLogin, setPendingLogin } = useFlow();

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => setOtpError(null), [otp]);

  if (!pendingLogin) return <Navigate to="/login" replace />;
  const { identifier, sessionId, returnTo } = pendingLogin;

  async function verify(code: string) {
    if (submittingRef.current || locked) return;
    if (!OTP_PATTERN.test(code)) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await authApi.verifyLoginOtp({ identifier, otp: code }, sessionId);
      signIn(response, identifier);
      setPendingLogin(null);
      navigate(returnTo && returnTo !== "/login" ? returnTo : "/", { replace: true });
    } catch (error) {
      const status = statusOf(error);
      const message = errorMessage(error, "loginVerify");
      if (status === 401) {
        setOtpError(message);
      } else if (status === 404) {
        setPendingLogin(null);
        navigate("/login", { replace: true, state: { identifier } });
        snackbar.show({ message, type: "warning" });
      } else {
        if (status === 429) setLocked(true);
        setFormError(message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function resend() {
    setOtp("");
    setFormError(null);
    setLocked(false);
    try {
      const { sessionId: nextSessionId } = await authApi.requestLoginOtp({ identifier });
      setPendingLogin({ ...pendingLogin!, sessionId: nextSessionId });
      snackbar.show({ message: "A new code is on its way.", type: "success" });
    } catch (error) {
      setFormError(errorMessage(error, "loginRequest"));
    }
  }

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={
        <>
          We sent a 6-digit code to <strong>{maskIdentifier(identifier)}</strong>.
        </>
      }
      step="Step 2 of 2"
      footer={
        <p>
          <Link to="/login" state={{ identifier }}>
            Use a different email or phone
          </Link>
        </p>
      }
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void verify(otp);
        }}
      >
        <OtpField
          value={otp}
          onChange={setOtp}
          onSubmit={(code) => void verify(code)}
          error={otpError}
          disabled={submitting || locked}
          autoFocus
          showResend
          onResend={() => void resend()}
        />
        <FormAlert message={formError} />
        <Button
          type="submit"
          variant="filled"
          fullWidth
          loading={submitting}
          disabled={submitting || locked || otp.length !== 6}
        >
          Verify &amp; log in
        </Button>
      </form>
    </AuthLayout>
  );
}
