import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { authApi } from "../../api";
import { statusOf } from "../../api/errors";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { OtpField } from "../../components/auth/OtpField";
import { errorMessage } from "../../lib/errorMessages";
import { useFlow } from "../FlowContext";
import { OTP_PATTERN } from "../signup/signupForm";
import { inviteCompleteRequest } from "./inviteRequest";

export function InviteVerifyPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { pendingInvite, setPendingInvite } = useFlow();

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!pendingInvite) return <Navigate to="/login" replace />;
  const invite = pendingInvite;
  const backToInvite = `/invite?token=${encodeURIComponent(invite.token)}`;

  async function verify(code: string) {
    if (submittingRef.current) return;
    if (!OTP_PATTERN.test(code)) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await authApi.completeSignup(inviteCompleteRequest(invite, code), invite.sessionId);
      setPendingInvite(null);
      navigate("/signup/done", { replace: true });
    } catch (error) {
      const status = statusOf(error);
      const message = errorMessage(error, "signupComplete");
      if (status === 404 || status === 410) {
        setPendingInvite(null);
        snackbar.show({ message, type: "warning" });
        navigate(backToInvite, { replace: true });
      } else if (status === 409) {
        setOtpError(message);
      } else {
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
    try {
      const { sessionId } = await authApi.acceptInvite(invite.token, {
        firstName: invite.firstName,
        lastName: invite.lastName,
      });
      setPendingInvite({ ...invite, sessionId });
      snackbar.show({ message: "A new code is on its way.", type: "success" });
    } catch (error) {
      setFormError(errorMessage(error, "inviteAccept"));
    }
  }

  return (
    <AuthLayout
      title="Enter your code"
      brandName={invite.details.tenantName}
      brandLogoUrl={invite.details.tenantLogoUrl || undefined}
      subtitle={
        invite.details.maskedTarget ? (
          <>
            We sent a 6-digit code to <strong>{invite.details.maskedTarget}</strong>.
          </>
        ) : (
          "Enter the 6-digit code we just sent you."
        )
      }
      step="Step 2 of 2"
      footer={
        <p>
          <Link to={backToInvite}>← Back</Link>
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
          onChange={(value) => {
            setOtp(value);
            setOtpError(null);
          }}
          onSubmit={(code) => void verify(code)}
          error={otpError}
          disabled={submitting}
          autoFocus
          showResend
          onResend={() => void resend()}
        />
        <FormAlert message={formError} />
        <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting || otp.length !== 6}>
          Verify &amp; join
        </Button>
      </form>
    </AuthLayout>
  );
}
