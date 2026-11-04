import { OtpInput } from "@cloudstrytech/ui-components";

interface OtpFieldProps {
  label?: string;
  value: string;
  onChange(value: string): void;
  /** Fired when all 6 digits are entered, or Enter is pressed. */
  onSubmit?(value: string): void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Show the library's resend control + countdown on this field. */
  showResend?: boolean;
  onResend?(): void;
  resendLabel?: string;
  /** Seconds before resend is allowed. */
  resendAfterSeconds?: number;
}

/** 6-digit code input on top of the library's OtpInput. */
export function OtpField({
  label,
  value,
  onChange,
  onSubmit,
  error,
  disabled,
  autoFocus,
  showResend = false,
  onResend,
  resendLabel = "Resend code",
  resendAfterSeconds = 30,
}: OtpFieldProps) {
  return (
    <div className="otp-field">
      {label && <p className="field-label">{label}</p>}
      <OtpInput
        length={6}
        value={value}
        onChange={(next: string) => onChange(next.replace(/\D/g, ""))}
        onComplete={(code: string) => onSubmit?.(code)}
        onEnter={(code: string) => onSubmit?.(code)}
        onResend={onResend}
        error={error || null}
        disabled={disabled}
        autoFocus={autoFocus}
        showTimer={showResend}
        initialSeconds={resendAfterSeconds}
        description="Didn't get the code?"
        resendLabel={resendLabel}
        timerPrefix="Resend in"
        canResend={undefined}
        timerText={undefined}
      />
    </div>
  );
}
