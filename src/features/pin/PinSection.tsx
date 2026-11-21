import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, useSnackbar } from "@cloudstrytech/ui-components";
import { isApiError, pinApi, type PinStatus } from "../../api";
import { FormAlert } from "../../components/auth/FormAlert";
import { useTenant } from "../tenant/TenantContext";
import { deviceStore } from "./deviceStore";
import { NewPinFields } from "./NewPinFields";
import { PinField } from "./PinField";
import { newPinErrors, PIN_PATTERN, type NewPinErrors } from "./pinRules";

/** e.g. "17 Nov 2026" from an ISO date-time. */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Settings: PIN on/off state, change PIN, and the devices that can log in with it. */
export function PinSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const { tenant, pin: settings } = useTenant();
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<NewPinErrors & { current?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const thisDevice = deviceStore.list(tenant?.tenantId).map((d) => d.deviceId);

  const load = useCallback(() => {
    pinApi
      .getPinStatus()
      .then((result) => {
        setStatus(result);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (settings.enabled) load();
  }, [settings.enabled, load]);

  if (!settings.enabled || failed) return null;

  const setNewPin = () => navigate("/pin/setup", { state: { returnTo: location.pathname, forgotPin: true } });
  // Trust this device with the existing PIN (the same screen as right after an OTP login).
  const useOnThisDevice = () => navigate("/pin/setup", { state: { returnTo: location.pathname } });
  const trustedHere = !!status?.devices.some((device) => thisDevice.includes(device.deviceId));

  async function change(event: FormEvent) {
    event.preventDefault();
    if (!PIN_PATTERN.test(current)) {
      setErrors({ current: "Enter your current PIN." });
      return;
    }
    const problems = newPinErrors(pin, confirm);
    setErrors(problems);
    if (problems.pin || problems.confirm) return;
    setBusy(true);
    setFormError(null);
    try {
      await pinApi.changePin({ currentPin: current, pin });
      snackbar.show({ message: "Your PIN is changed on all your devices.", type: "success" });
      setChanging(false);
      setCurrent("");
      setPin("");
      setConfirm("");
      load();
    } catch (error) {
      const code = isApiError(error) ? error.code : "";
      if (code === "PIN_INVALID") setErrors({ current: (error as Error).message });
      else if (code === "PIN_TOO_SIMPLE") setErrors({ pin: (error as Error).message });
      else if (code === "PIN_LOCKED") {
        setFormError("Your PIN is locked after too many wrong tries. Set a new one after logging in with a code.");
        load();
      } else setFormError(isApiError(error) ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(deviceId: string) {
    setBusy(true);
    try {
      await pinApi.removeDevice(deviceId);
      deviceStore.remove(deviceId);
      snackbar.show({ message: "That device can no longer log in with your PIN.", type: "success" });
      load();
    } catch (error) {
      snackbar.show({ message: isApiError(error) ? error.message : "Couldn't remove the device.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel pin-panel">
      <h2 className="panel__title">PIN login</h2>
      {!status ? (
        <p className="panel__text">Loading…</p>
      ) : !status.pinSet || status.locked ? (
        <>
          <p className="panel__text">
            {status.locked
              ? "Your PIN is locked after too many wrong tries. Set a new one."
              : "Log in with a 6-digit PIN on this device instead of waiting for a code."}
          </p>
          <Button variant="tonal" size="sm" onClick={setNewPin}>
            {status.locked ? "Set a new PIN" : "Set a PIN"}
          </Button>
        </>
      ) : changing ? (
        <form className="form-stack" noValidate onSubmit={change}>
          <PinField
            label="Current PIN"
            value={current}
            onChange={(value) => {
              setCurrent(value);
              setErrors({});
            }}
            error={errors.current}
            disabled={busy}
            autoFocus
          />
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
            disabled={busy}
            pinLabel="New PIN"
          />
          <FormAlert message={formError} />
          <div className="form-actions">
            <Button type="button" variant="text" onClick={() => setChanging(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" loading={busy} disabled={busy}>
              Change PIN
            </Button>
          </div>
          <p className="inline-hint">
            <button type="button" className="link-btn" onClick={setNewPin} disabled={busy}>
              Forgot your PIN?
            </button>
          </p>
        </form>
      ) : (
        <>
          <p className="panel__text">Your PIN works on the devices below. Remove any you no longer use.</p>
          {!trustedHere && (
            <div className="pin-panel__notice">
              <p className="panel__text">
                This device doesn't use your PIN yet. Add it to log in here with the same PIN, without a code.
              </p>
              <Button variant="filled" size="sm" onClick={useOnThisDevice}>
                Use PIN on this device
              </Button>
            </div>
          )}
          <ul className="device-list">
            {status.devices.map((device) => (
              <li key={device.deviceId} className="device-list__item">
                <span>
                  <strong>{device.name || "Device"}</strong>
                  {thisDevice.includes(device.deviceId) && <span className="device-list__this"> · this device</span>}
                  <br />
                  <span className="device-list__meta">
                    {device.lastUsedAt
                      ? `Last used ${formatDate(device.lastUsedAt)}`
                      : device.addedAt
                        ? `Added ${formatDate(device.addedAt)}`
                        : ""}
                  </span>
                </span>
                <button type="button" className="link-btn" onClick={() => void remove(device.deviceId)} disabled={busy}>
                  Remove
                </button>
              </li>
            ))}
            {status.devices.length === 0 && <li className="device-list__meta">No devices yet.</li>}
          </ul>
          <Button variant="tonal" size="sm" onClick={() => setChanging(true)}>
            Change PIN
          </Button>
        </>
      )}
    </section>
  );
}
