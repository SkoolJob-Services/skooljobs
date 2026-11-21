import { useState, type FormEvent } from "react";
import { Button, Input, useSnackbar } from "@cloudstrytech/ui-components";
import { accountApi } from "../../api";
import { statusOf } from "../../api/errors";
import { FormAlert } from "../../components/auth/FormAlert";
import { OtpField } from "../../components/auth/OtpField";
import { PhoneField } from "../../components/auth/PhoneField";
import { DEFAULT_COUNTRY_CODE, isValidE164, maskIdentifier, maskPhone, toE164 } from "../../lib/contact";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "../tenant/TenantContext";
import type { Channel } from "../tenant/otpChannels";
import { deviceStore } from "../pin/deviceStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

type Step = "idle" | "enter" | "verify";

interface LoginContactSectionProps {
  /** Current login email (the session's, else the profile's). */
  email?: string;
  /** Current WhatsApp number (the profile's, which follows signup's user-profile record). */
  whatsapp?: string;
  /** Current mobile number (the profile's, which follows signup's user-profile record). */
  mobile?: string;
  /** Called after a change is verified, so the page can reload the profile (it follows shortly after). */
  onChanged?: (change: ContactChange) => void;
}

/** The verified new value, by the teacher-profile field it lands in. */
export interface ContactChange {
  field: "email" | "whatsapp" | "mobile";
  value: string;
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** The logged-in identifier moves to the new value when the user logged in with the old one. */
function useFollowLogin() {
  const { session, changeLoginIdentifier } = useAuth();
  return (previous: string | undefined, next: string) => {
    const current = session?.identifier;
    if (!current || !previous || current.toLowerCase() !== previous.toLowerCase()) return;
    changeLoginIdentifier(next);
    deviceStore.changeIdentifier(current, next, maskIdentifier(next));
  };
}

/**
 * Settings: the contacts the user logs in with — email, WhatsApp number and mobile (SMS) —
 * each added or changed with a code sent to the new address or number. Only the channels the
 * organisation has switched on for login codes (tenant otpChannels.login) are shown. The
 * change is made on the signup user-profile record, so the next login uses it; the teacher
 * profile follows through signup's USER_EMAIL_VERIFIED / USER_WHATSAPP_VERIFIED /
 * USER_PHONE_VERIFIED events.
 */
export function LoginContactSection({ email, whatsapp, mobile, onChanged }: LoginContactSectionProps) {
  const { channels } = useTenant();
  const enabled = (channel: Channel) => channels.login.includes(channel);
  if (!channels.login.length) return null;

  const names: Record<Channel, string> = { EMAIL: "email", WHATSAPP: "WhatsApp", SMS: "mobile" };
  const shown = channels.login.map((channel) => names[channel]);
  const title = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} & ${shown[shown.length - 1]}` : shown[0];

  return (
    <section className="panel pin-panel">
      <h2 className="panel__title">Login {title}</h2>
      {enabled("EMAIL") && <EmailChange email={email} onChanged={onChanged} />}
      {enabled("WHATSAPP") && <NumberChange channel="WHATSAPP" current={whatsapp} onChanged={onChanged} />}
      {enabled("SMS") && <NumberChange channel="SMS" current={mobile} onChanged={onChanged} />}
    </section>
  );
}

function EmailChange({ email, onChanged }: { email?: string; onChanged?: (change: ContactChange) => void }) {
  const snackbar = useSnackbar();
  const { session } = useAuth();
  const followLogin = useFollowLogin();
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const currentEmail =
    verifiedEmail || (session?.identifier?.includes("@") ? session.identifier : email) || "";

  const [step, setStep] = useState<Step>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("idle");
    setNewEmail("");
    setCode("");
    setFieldError(null);
    setFormError(null);
  };

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const target = newEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(target)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (target === currentEmail.toLowerCase()) {
      setFieldError("This is already your login email.");
      return;
    }
    setBusy(true);
    setFieldError(null);
    setFormError(null);
    try {
      await accountApi.requestEmailCode(target);
      setNewEmail(target);
      setCode("");
      setStep("verify");
    } catch (error) {
      if (statusOf(error) === 409) setFieldError("This email is used by another account.");
      else setFormError(messageOf(error, "Couldn't send the code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (busy) return;
    if (!OTP_PATTERN.test(value)) {
      setFieldError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setFieldError(null);
    setFormError(null);
    try {
      await accountApi.verifyEmailCode(newEmail, value);
      followLogin(currentEmail, newEmail);
      setVerifiedEmail(newEmail);
      snackbar.show({ message: "Your login email is changed. Use it the next time you log in.", type: "success" });
      reset();
      onChanged?.({ field: "email", value: newEmail });
    } catch (error) {
      const status = statusOf(error);
      if (status === 400 || status === 401) setFieldError(messageOf(error, "The code is not correct."));
      else setFormError(messageOf(error, "Couldn't verify the code. Please try again."));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="login-contact__row">
        <span>
          <span className="login-contact__label">Login email</span>
          <strong>{currentEmail || "Not set"}</strong>
        </span>
        {step === "idle" && (
          <Button variant="tonal" size="sm" onClick={() => setStep("enter")}>
            {currentEmail ? "Change email" : "Add email"}
          </Button>
        )}
      </div>
      {step === "idle" && !currentEmail && (
        <p className="field-hint">Add an email to log in with it and get updates by email.</p>
      )}

      {step === "enter" && (
        <form className="form-stack login-contact__form" noValidate onSubmit={sendCode}>
          <label className="field">
            <span className="field-label">New email address</span>
            <Input
              type="email"
              value={newEmail}
              onChange={(value: string) => {
                setNewEmail(value);
                setFieldError(null);
              }}
              placeholder="name@example.com"
              autoFocus
            />
            {fieldError && <span className="field-error">{fieldError}</span>}
          </label>
          <p className="field-hint">We'll send a 6-digit code to the new address to confirm it's yours.</p>
          <FormAlert message={formError} />
          <div className="form-actions">
            <Button type="button" variant="text" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" loading={busy} disabled={busy}>
              Send code
            </Button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form
          className="form-stack login-contact__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void verify(code);
          }}
        >
          <OtpField
            label={`Code sent to ${newEmail}`}
            value={code}
            onChange={(value) => {
              setCode(value);
              setFieldError(null);
            }}
            onSubmit={(value) => void verify(value)}
            error={fieldError}
            disabled={busy}
            autoFocus
            showResend
            onResend={() => void sendCode()}
          />
          <FormAlert message={formError} />
          <div className="form-actions">
            <Button type="button" variant="text" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" loading={busy} disabled={busy || code.length !== 6}>
              Verify &amp; change
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

/** Wording and calls for the two number channels. */
const NUMBER_CHANNEL = {
  WHATSAPP: {
    label: "WhatsApp number",
    via: "on WhatsApp",
    addButton: "Add WhatsApp",
    addHint: "Add a WhatsApp number to log in with it and get updates on WhatsApp.",
    changed: "Your WhatsApp number is changed. Use it the next time you log in with WhatsApp.",
    added: "Your WhatsApp number is added. You can now log in with it.",
    request: (number: string) => accountApi.requestWhatsAppCode(number),
    verify: (number: string, otp: string) => accountApi.verifyWhatsAppCode(number, otp),
  },
  SMS: {
    label: "mobile number",
    via: "by SMS",
    addButton: "Add mobile",
    addHint: "Add a mobile number to log in with a code by SMS.",
    changed: "Your mobile number is changed. Use it the next time you log in by SMS.",
    added: "Your mobile number is added. You can now log in with it by SMS.",
    request: (number: string) => accountApi.requestPhoneCode(number),
    verify: (number: string, otp: string) => accountApi.verifyPhoneCode(number, otp),
  },
} as const;

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function NumberChange({
  channel,
  current,
  onChanged,
}: {
  channel: "WHATSAPP" | "SMS";
  current?: string;
  onChanged?: (change: ContactChange) => void;
}) {
  const wording = NUMBER_CHANNEL[channel];
  const snackbar = useSnackbar();
  const followLogin = useFollowLogin();
  const [verifiedNumber, setVerifiedNumber] = useState<string | null>(null);
  const currentNumber = verifiedNumber || current || "";

  const [step, setStep] = useState<Step>("idle");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [localNumber, setLocalNumber] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("idle");
    setLocalNumber("");
    setNewNumber("");
    setCode("");
    setFieldError(null);
    setFormError(null);
  };

  async function send(target: string) {
    setBusy(true);
    setFieldError(null);
    setFormError(null);
    try {
      await wording.request(target);
      setNewNumber(target);
      setCode("");
      setStep("verify");
    } catch (error) {
      if (statusOf(error) === 409) setFieldError(`This ${wording.label} is used by another account.`);
      else setFormError(messageOf(error, "Couldn't send the code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function submitNumber(event: FormEvent) {
    event.preventDefault();
    const target = toE164(countryCode, localNumber);
    if (!isValidE164(target)) {
      setFieldError(`Enter a valid ${wording.label}.`);
      return;
    }
    if (target === currentNumber) {
      setFieldError(`This is already your ${wording.label}.`);
      return;
    }
    void send(target);
  }

  async function verify(value: string) {
    if (busy) return;
    if (!OTP_PATTERN.test(value)) {
      setFieldError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setFieldError(null);
    setFormError(null);
    try {
      await wording.verify(newNumber, value);
      followLogin(currentNumber, newNumber);
      setVerifiedNumber(newNumber);
      snackbar.show({ message: currentNumber ? wording.changed : wording.added, type: "success" });
      reset();
      onChanged?.({ field: channel === "WHATSAPP" ? "whatsapp" : "mobile", value: newNumber });
    } catch (error) {
      const status = statusOf(error);
      if (status === 409) setFieldError(`This ${wording.label} is used by another account.`);
      else if (status === 400 || status === 401) setFieldError(messageOf(error, "The code is not correct."));
      else setFormError(messageOf(error, "Couldn't verify the code. Please try again."));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="login-contact__row">
        <span>
          <span className="login-contact__label">{capitalise(wording.label)}</span>
          <strong>{currentNumber ? maskPhone(currentNumber) : "Not set"}</strong>
        </span>
        {step === "idle" && (
          <Button variant="tonal" size="sm" onClick={() => setStep("enter")}>
            {currentNumber ? "Change number" : wording.addButton}
          </Button>
        )}
      </div>
      {step === "idle" && !currentNumber && <p className="field-hint">{wording.addHint}</p>}

      {step === "enter" && (
        <form className="form-stack login-contact__form" noValidate onSubmit={submitNumber}>
          <PhoneField
            label={currentNumber ? `New ${wording.label}` : capitalise(wording.label)}
            name={`settings-${channel.toLowerCase()}`}
            countryCode={countryCode}
            number={localNumber}
            onCountryCodeChange={(value) => {
              setCountryCode(value);
              setFieldError(null);
            }}
            onNumberChange={(value) => {
              setLocalNumber(value);
              setFieldError(null);
            }}
            error={fieldError ?? undefined}
            disabled={busy}
          />
          <p className="field-hint">
            We'll send a 6-digit code to this number {wording.via} to confirm it's yours.
          </p>
          <FormAlert message={formError} />
          <div className="form-actions">
            <Button type="button" variant="text" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" loading={busy} disabled={busy}>
              Send code
            </Button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form
          className="form-stack login-contact__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void verify(code);
          }}
        >
          <OtpField
            label={`Code sent ${wording.via} to ${maskPhone(newNumber)}`}
            value={code}
            onChange={(value) => {
              setCode(value);
              setFieldError(null);
            }}
            onSubmit={(value) => void verify(value)}
            error={fieldError}
            disabled={busy}
            autoFocus
            showResend
            onResend={() => void send(newNumber)}
          />
          <FormAlert message={formError} />
          <div className="form-actions">
            <Button type="button" variant="text" onClick={reset} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" loading={busy} disabled={busy || code.length !== 6}>
              {currentNumber ? "Verify & change" : "Verify & add"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
