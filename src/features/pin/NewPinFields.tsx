import { PinField } from "./PinField";
import type { NewPinErrors } from "./pinRules";

interface NewPinFieldsProps {
  pin: string;
  confirm: string;
  onPin(value: string): void;
  onConfirm(value: string): void;
  errors?: NewPinErrors;
  disabled?: boolean;
  autoFocus?: boolean;
  pinLabel?: string;
}

/** New PIN + confirm, used at signup, invite, "set your PIN" and "change PIN". */
export function NewPinFields({ pin, confirm, onPin, onConfirm, errors, disabled, autoFocus, pinLabel }: NewPinFieldsProps) {
  return (
    <>
      <PinField
        label={pinLabel ?? "Choose a 6-digit PIN"}
        value={pin}
        onChange={onPin}
        error={errors?.pin}
        hint="Not 111111, 123456 or a pattern like 121212."
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <PinField label="Enter the PIN again" value={confirm} onChange={onConfirm} error={errors?.confirm} disabled={disabled} />
    </>
  );
}
