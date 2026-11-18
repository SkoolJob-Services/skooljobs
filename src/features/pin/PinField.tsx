import { useEffect, useId, useRef } from "react";
import { PIN_LENGTH } from "./pinRules";

interface PinFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  /** Fired when all six digits are in. */
  onComplete?(value: string): void;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six-digit PIN entry shown as dots (never the digits). One real input with a numeric
 * keypad sits over the dots, so paste, autofill-off and screen readers behave normally.
 */
export function PinField({ label, value, onChange, onComplete, error, hint, disabled, autoFocus }: PinFieldProps) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className={`pin-field${error ? " pin-field--error" : ""}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="pin-field__box" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          id={id}
          className="pin-field__input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={PIN_LENGTH}
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
            onChange(next);
            if (next.length === PIN_LENGTH && next !== value) onComplete?.(next);
          }}
        />
        <div className="pin-field__dots" aria-hidden="true">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`pin-field__dot${i < value.length ? " is-filled" : ""}${i === value.length ? " is-next" : ""}`}
            />
          ))}
        </div>
      </div>
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? "field-error" : "field-hint"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
