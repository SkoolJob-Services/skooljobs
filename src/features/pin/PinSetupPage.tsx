import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { isApiError, pinApi, type DeviceCredentials } from "../../api";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { maskIdentifier } from "../../lib/contact";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "../tenant/TenantContext";
import { deviceStore, type SavedDevice } from "./deviceStore";
import { NewPinFields } from "./NewPinFields";
import { PinField } from "./PinField";
import { guessDeviceName, newPinErrors, PIN_PATTERN, type NewPinErrors } from "./pinRules";

export interface PinSetupState {
  returnTo?: string;
  /** Came from "Forgot PIN?": set a new PIN even if one exists. */
  forgotPin?: boolean;
}

type Mode = "loading" | "set" | "trust";

/**
 * Right after an OTP login: set a PIN (first, forgotten or locked) or, when the account
 * already has one, trust this device with it. Skipped when this device is already trusted.
 */
export function PinSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const { session, signOut } = useAuth();
  const { tenant, pin: pinSettings } = useTenant();
  const { returnTo, forgotPin } = (location.state ?? {}) as PinSetupState;
  const next =
    returnTo && returnTo !== "/" && !returnTo.startsWith("/login") && !returnTo.startsWith("/pin") ? returnTo : "/app";

  const [mode, setMode] = useState<Mode>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedDevice | undefined>();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<NewPinErrors>({});
  const [pinError, setPinError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [hadPin, setHadPin] = useState(false);
  const started = useRef(false);

  const done = () => navigate(next, { replace: true });

  useEffect(() => {
    if (started.current || !pinSettings.enabled) return;
    started.current = true;
    pinApi
      .getPinStatus()
      .then((status) => {
        const mine = deviceStore
          .list(tenant?.tenantId)
          .find((d) => status.devices.some((device) => device.deviceId === d.deviceId));
        setSaved(mine);
        setHadPin(status.pinSet);
        if (forgotPin || !status.pinSet || status.locked) {
          if (status.locked) setNotice("Your PIN was locked after too many wrong tries. Set a new one.");
          setMode("set");
        } else if (!mine) {
          setMode("trust");
        } else {
          done();
        }
      })
      // Status unavailable (older server): don't block the login.
      .catch(() => done());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSettings.enabled]);

  if (!pinSettings.enabled) return <Navigate to={next} replace />;

  function remember(device: DeviceCredentials) {
    const identifier = session?.identifier;
    deviceStore.save(
      {
        deviceId: device.deviceId,
        deviceSecret: device.deviceSecret,
        deviceName: device.deviceName,
        tenantId: session?.tenantId ?? tenant?.tenantId,
        label: identifier ? maskIdentifier(identifier) : "Your account",
        identifier,
      },
      saved ? [saved.deviceId] : undefined,
    );
  }

  async function submitNewPin(event: FormEvent) {
    event.preventDefault();
    const problems = newPinErrors(pin, confirm);
    setErrors(problems);
    if (problems.pin || problems.confirm) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await pinApi.setPin({ pin, deviceName: guessDeviceName(), deviceId: saved?.deviceId });
      remember(result.device);
      snackbar.show({ message: "Your PIN is set. Use it to log in on this device.", type: "success" });
      done();
    } catch (error) {
      if (isApiError(error) && (error.code === "PIN_TOO_SIMPLE" || error.code === "PIN_FORMAT")) {
        setErrors({ pin: error.message });
      } else if (isApiError(error) && error.code === "PIN_NEEDS_OTP") {
        setNeedsOtp(true);
        setFormError("For your safety, setting a PIN needs a fresh login with a code.");
      } else {
        setFormError(isApiError(error) ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTrust(code: string) {
    if (submitting) return;
    if (!PIN_PATTERN.test(code)) {
      setPinError("Enter your 6-digit PIN.");
      return;
    }
    setSubmitting(true);
    setPinError(null);
    setFormError(null);
    try {
      const result = await pinApi.trustDevice({ pin: code, deviceName: guessDeviceName() });
      remember(result.device);
      snackbar.show({ message: "Next time, log in here with your PIN.", type: "success" });
      done();
    } catch (error) {
      setPin("");
      if (isApiError(error) && error.code === "PIN_INVALID") {
        setPinError(error.message);
      } else if (isApiError(error) && error.code === "PIN_LOCKED") {
        setNotice("Your PIN is locked after too many wrong tries. Set a new one.");
        setMode("set");
      } else {
        setFormError(isApiError(error) ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const skip = (
    <p>
      <button type="button" className="link-btn" onClick={done} disabled={submitting}>
        Not now
      </button>
    </p>
  );

  if (mode === "loading") {
    return (
      <AuthLayout title="One moment…">
        <p className="panel__text">Checking your PIN settings.</p>
      </AuthLayout>
    );
  }

  if (mode === "trust") {
    return (
      <AuthLayout
        title="Use your PIN on this device"
        subtitle="Enter the PIN you set before. Next time you can log in here with it, without a code."
        footer={skip}
      >
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitTrust(pin);
          }}
        >
          <PinField
            label="Your PIN"
            value={pin}
            onChange={(value) => {
              setPin(value);
              setPinError(null);
            }}
            onComplete={(value) => void submitTrust(value)}
            error={pinError}
            disabled={submitting}
            autoFocus
          />
          <FormAlert message={formError} />
          <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting || pin.length !== 6}>
            Use PIN on this device
          </Button>
          <p className="inline-hint">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setPin("");
                setMode("set");
              }}
              disabled={submitting}
            >
              Forgot PIN? Set a new one
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={hadPin ? "Set a new PIN" : "Set a PIN for quick login"}
      subtitle="Next time, log in on this device with your PIN instead of waiting for a code. Your other trusted devices use the new PIN too."
      footer={skip}
    >
      <form className="form-stack" noValidate onSubmit={submitNewPin}>
        <FormAlert message={notice} tone="info" />
        <NewPinFields
          pin={pin}
          confirm={confirm}
          onPin={(value) => {
            setPin(value);
            setErrors({});
          }}
          onConfirm={(value) => {
            setConfirm(value);
            setErrors({});
          }}
          errors={errors}
          disabled={submitting}
          autoFocus
        />
        <FormAlert message={formError} />
        {needsOtp ? (
          <Button
            type="button"
            variant="filled"
            fullWidth
            onClick={async () => {
              const identifier = session?.identifier;
              await signOut();
              navigate("/login", {
                replace: true,
                state: { useOtp: true, forgotPin: true, settingPin: !hadPin, identifier, from: next },
              });
            }}
          >
            Log in with a code to set your PIN
          </Button>
        ) : (
          <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting}>
            Set PIN
          </Button>
        )}
      </form>
    </AuthLayout>
  );
}
