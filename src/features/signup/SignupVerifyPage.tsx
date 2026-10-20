import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { authApi, type CompleteSignupRequest } from "../../api";
import { statusOf } from "../../api/errors";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { OtpField } from "../../components/auth/OtpField";
import { maskEmail, maskPhone } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { useFlow } from "../FlowContext";
import { OTP_PATTERN, type OtpChannel } from "./signupForm";

type OtpValues = Record<OtpChannel, string>;
const EMPTY_OTPS: OtpValues = { email: "", phone: "", whatsapp: "" };

export function SignupVerifyPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { pendingSignup, setPendingSignup } = useFlow();

  const [otps, setOtps] = useState<OtpValues>(EMPTY_OTPS);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!pendingSignup) return <Navigate to="/signup" replace />;
  const { request, channels, sessionId } = pendingSignup;

  const destinations: Record<OtpChannel, string> = {
    email: request.email ? `email ${maskEmail(request.email)}` : "",
    phone: request.phone ? `SMS ${maskPhone(request.phone)}` : "",
    whatsapp: request.whatUpNo ? `WhatsApp ${maskPhone(request.whatUpNo)}` : "",
  };
  const allFilled = channels.every((channel) => OTP_PATTERN.test(otps[channel]));

  function setOtp(channel: OtpChannel, value: string) {
    setOtps((prev) => ({ ...prev, [channel]: value }));
    setOtpError(null);
  }

  function restart(message: string) {
    setPendingSignup(null);
    snackbar.show({ message, type: "warning" });
    navigate("/signup", { replace: true });
  }

  // `override` carries a code straight from OtpInput's onComplete, which can
  // fire before React state has caught up with the last digit.
  async function handleSubmit(event?: FormEvent, override?: Partial<OtpValues>) {
    event?.preventDefault();
    if (submittingRef.current) return;
    const codes: OtpValues = { ...otps, ...override };
    if (!channels.every((channel) => OTP_PATTERN.test(codes[channel]))) {
      setOtpError("Enter the 6-digit code for each channel.");
      return;
    }

    const body: CompleteSignupRequest = {
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone,
      whatUpNo: request.whatUpNo,
      isEmailOtpRequested: request.isEmailOtpRequested,
      isPhoneOtpRequested: request.isPhoneOtpRequested,
      isWhatUpNoOtpRequested: request.isWhatUpNoOtpRequested,
      emailOtpHash: channels.includes("email") ? codes.email : undefined,
      phoneOtpHash: channels.includes("phone") ? codes.phone : undefined,
      whatUpNoOtpHash: channels.includes("whatsapp") ? codes.whatsapp : undefined,
    };

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await authApi.completeSignup(body, sessionId);
      setPendingSignup(null);
      navigate("/signup/done", { replace: true, state: { identifier: request.email ?? request.phone ?? request.whatUpNo } });
    } catch (error) {
      const status = statusOf(error);
      const message = errorMessage(error, "signupComplete");
      if (status === 404 || status === 410) restart(message);
      else if (status === 409) setOtpError(message);
      else setFormError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function resend() {
    setOtps(EMPTY_OTPS);
    setFormError(null);
    try {
      // The contract has no dedicated resend endpoint, so repeat the start call.
      const { sessionId: nextSessionId } = await authApi.createSignupSession(request);
      setPendingSignup({ ...pendingSignup!, sessionId: nextSessionId });
      snackbar.show({ message: channels.length > 1 ? "New codes are on their way." : "A new code is on its way.", type: "success" });
    } catch (error) {
      setFormError(errorMessage(error, "signupStart"));
    }
  }

  return (
    <AuthLayout
      title="Verify your details"
      subtitle={
        channels.length > 1
          ? "Enter the 6-digit code we sent to each of these."
          : "Enter the 6-digit code we just sent you."
      }
      step="Step 2 of 2"
      footer={
        <p>
          <Link to="/signup">← Edit details</Link>
        </p>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        {channels.map((channel, index) => (
          <OtpField
            key={channel}
            label={`Code sent by ${destinations[channel]}`}
            value={otps[channel]}
            onChange={(value) => setOtp(channel, value)}
            onSubmit={channels.length === 1 ? (code) => void handleSubmit(undefined, { [channel]: code }) : undefined}
            error={index === channels.length - 1 ? otpError : null}
            disabled={submitting}
            autoFocus={index === 0}
            showResend={index === channels.length - 1}
            resendLabel={channels.length > 1 ? "Resend all codes" : "Resend code"}
            onResend={() => void resend()}
          />
        ))}
        <FormAlert message={formError} />
        <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting || !allFilled}>
          Verify &amp; create account
        </Button>
      </form>
    </AuthLayout>
  );
}
