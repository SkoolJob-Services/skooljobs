import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { isApiError, pinApi } from "../../api";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "../tenant/TenantContext";
import { deviceStore, type SavedDevice } from "./deviceStore";
import { PinField } from "./PinField";
import { PIN_PATTERN } from "./pinRules";

interface LocationState {
  from?: string;
}

/** Saved in the last 10 minutes (from signup / invite, account possibly still being created). */
const justSaved = (device: SavedDevice) => Date.now() - Date.parse(device.savedAt) < 10 * 60 * 1000;

/**
 * Default login on a device that has been trusted (after an OTP): pick the account
 * (when more than one is saved here) and enter the PIN.
 */
export function PinLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const { signIn } = useAuth();
  const { tenant, pin: pinSettings } = useTenant();
  const from = (location.state as LocationState | null)?.from;

  const [accounts, setAccounts] = useState<SavedDevice[]>(() => deviceStore.list(tenant?.tenantId));
  const [selectedId, setSelectedId] = useState(accounts[0]?.deviceId);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const account = accounts.find((a) => a.deviceId === selectedId) ?? accounts[0];

  useEffect(() => {
    setPin("");
    setPinError(null);
    setFormError(null);
    setLocked(false);
  }, [selectedId]);

  if (!pinSettings.enabled || !account) {
    return <Navigate to="/login" replace state={{ from, useOtp: true }} />;
  }

  const otpLogin = (extra: Record<string, unknown> = {}) =>
    navigate("/login", { state: { from, useOtp: true, identifier: account.identifier, ...extra } });

  function forget(device: SavedDevice) {
    deviceStore.remove(device.deviceId);
    const rest = accounts.filter((a) => a.deviceId !== device.deviceId);
    setAccounts(rest);
    setSelectedId(rest[0]?.deviceId);
  }

  async function submit(code: string) {
    if (submittingRef.current || locked) return;
    if (!PIN_PATTERN.test(code)) {
      setPinError("Enter your 6-digit PIN.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setPinError(null);
    setFormError(null);
    try {
      const response = await pinApi.pinLogin({ deviceId: account.deviceId, deviceSecret: account.deviceSecret, pin: code });
      deviceStore.touch(account.deviceId);
      signIn(response, account.identifier ?? account.label);
      navigate(from && from !== "/login" && from !== "/" ? from : "/app", { replace: true });
    } catch (error) {
      setPin("");
      const code = isApiError(error) ? error.code : "";
      const message = isApiError(error) ? error.message : "Something went wrong. Please try again.";
      if (code === "PIN_INVALID") {
        setPinError(message);
      } else if (code === "PIN_LOCKED") {
        setLocked(true);
        setFormError("Too many wrong PINs. Log in with a code to set a new PIN.");
      } else if ((code === "DEVICE_NOT_TRUSTED" || code === "PIN_NOT_SET") && justSaved(account)) {
        // Signup is processed in the background: the account may not be ready yet.
        setFormError("Your account is still being set up. Try again in a moment.");
      } else if (code === "DEVICE_NOT_TRUSTED" || code === "PIN_NOT_SET") {
        forget(account);
        snackbar.show({ message: "This device needs a code once more. Log in with a code.", type: "warning" });
        otpLogin();
      } else if (code === "PIN_LOGIN_DISABLED") {
        otpLogin();
      } else {
        setFormError(message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Enter your PIN"
      subtitle={accounts.length > 1 ? "Choose your account, then enter your PIN." : <>Welcome back, <strong>{account.label}</strong>.</>}
      footer={
        <>
          <p>
            <Link to="/login" state={{ from, useOtp: true }}>
              Log in with a code instead
            </Link>
          </p>
          <p>
            <button type="button" className="link-btn" onClick={() => forget(account)}>
              Not you? Remove {accounts.length > 1 ? "this account" : "your account"} from this device
            </button>
          </p>
        </>
      }
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(pin);
        }}
      >
        {accounts.length > 1 && (
          <div className="account-picker" role="radiogroup" aria-label="Account">
            {accounts.map((a) => (
              <button
                key={a.deviceId}
                type="button"
                role="radio"
                aria-checked={a.deviceId === account.deviceId}
                className={`account-picker__option${a.deviceId === account.deviceId ? " is-selected" : ""}`}
                onClick={() => setSelectedId(a.deviceId)}
                disabled={submitting}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <PinField
          label="PIN"
          value={pin}
          onChange={(value) => {
            setPin(value);
            setPinError(null);
          }}
          onComplete={(value) => void submit(value)}
          error={pinError}
          disabled={submitting || locked}
          autoFocus
        />
        <FormAlert message={formError} />
        {locked ? (
          <Button type="button" variant="filled" fullWidth onClick={() => otpLogin({ forgotPin: true })}>
            Log in with a code
          </Button>
        ) : (
          <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting || pin.length !== 6}>
            Log in
          </Button>
        )}
        <p className="inline-hint">
          <button type="button" className="link-btn" onClick={() => otpLogin({ forgotPin: true })} disabled={submitting}>
            Forgot PIN?
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
