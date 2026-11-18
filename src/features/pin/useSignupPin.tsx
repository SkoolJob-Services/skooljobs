import { useState } from "react";
import { Button } from "@cloudstrytech/ui-components";
import { isApiError, type CommandAcceptedResponse } from "../../api";
import { useTenant } from "../tenant/TenantContext";
import { deviceStore } from "./deviceStore";
import { NewPinFields } from "./NewPinFields";
import { guessDeviceName, newPinErrors, type NewPinErrors } from "./pinRules";

/**
 * Optional PIN chosen together with the signup / invite codes: hidden behind a
 * "Set a quick-login PIN" button, with "Skip" to close it again. Without a PIN the user
 * can set one later, after logging in with a code (or from Settings). The server checks and
 * hashes it, trusts this device and returns the device's credentials once (202 body).
 */
export function useSignupPin(disabled: boolean) {
  const { pin: settings, tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<NewPinErrors>({});

  /** Extra fields for /signup/complete, or null when the PIN needs fixing. */
  function requestFields(): { pin?: string; deviceName?: string } | null {
    if (!settings.enabled || !open || (!pin && !confirm)) return {};
    const problems = newPinErrors(pin, confirm);
    setErrors(problems);
    if (problems.pin || problems.confirm) return null;
    return { pin, deviceName: guessDeviceName() };
  }

  /** Saves the device returned by /signup/complete; true when PIN login is now set up here. */
  function remember(response: CommandAcceptedResponse | null | undefined, label: string, identifier?: string): boolean {
    const device = response?.device;
    if (!device?.deviceId || !device.deviceSecret) return false;
    deviceStore.save({
      deviceId: device.deviceId,
      deviceSecret: device.deviceSecret,
      deviceName: device.deviceName,
      tenantId: tenant?.tenantId,
      label,
      identifier,
    });
    return true;
  }

  /** Shows a PIN error from the server next to the field; true when handled. */
  function showServerError(error: unknown): boolean {
    if (isApiError(error) && (error.code === "PIN_TOO_SIMPLE" || error.code === "PIN_FORMAT")) {
      setErrors({ pin: error.message });
      return true;
    }
    return false;
  }

  function skip() {
    setOpen(false);
    setPin("");
    setConfirm("");
    setErrors({});
  }

  const fields = !settings.enabled ? null : !open ? (
    <div className="pin-offer">
      <Button type="button" variant="tonal" fullWidth onClick={() => setOpen(true)} disabled={disabled}>
        Set a quick-login PIN (optional)
      </Button>
      <p className="pin-setup__text">Log in on this device with a 6-digit PIN instead of waiting for a code. You can also set it later.</p>
    </div>
  ) : (
    <fieldset className="pin-setup">
      <legend className="pin-setup__title">Quick login PIN (optional)</legend>
      <p className="pin-setup__text">Log in on this device with a PIN instead of waiting for a code.</p>
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
        disabled={disabled}
        autoFocus
      />
      <button type="button" className="link-btn pin-setup__skip" onClick={skip} disabled={disabled}>
        Skip — I'll set a PIN later
      </button>
    </fieldset>
  );

  return { enabled: settings.enabled, fields, requestFields, remember, showServerError };
}
