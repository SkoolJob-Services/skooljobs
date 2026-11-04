import { Select, Input } from "@cloudstrytech/ui-components";
import { COUNTRY_CODES } from "../../lib/contact";

interface PhoneFieldProps {
  label: string;
  countryCode: string;
  number: string;
  onCountryCodeChange(value: string): void;
  onNumberChange(value: string): void;
  error?: string;
  supportingText?: string;
  disabled?: boolean;
  name: string;
}

/** Country code picker + local number, built from the library's Select and Input. */
export function PhoneField({
  label,
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  error,
  supportingText,
  disabled,
  name,
}: PhoneFieldProps) {
  return (
    <div className="phone-field">
      <span className="field-label" id={`${name}-label`}>
        {label}
      </span>
      <div className="phone-field__row">
        <div className="phone-field__code">
          <Select
            value={countryCode}
            options={COUNTRY_CODES}
            onChange={(value: string | string[]) => onCountryCodeChange(Array.isArray(value) ? value[0] ?? "" : value)}
            disabled={disabled}
            aria-label={`${label} country code`}
          />
        </div>
        <div className="phone-field__number">
          <Input
            name={name}
            type="tel"
            value={number}
            onChange={onNumberChange}
            placeholder="98765 43210"
            autoComplete="tel-national"
            error={error || undefined}
            supportingText={supportingText}
            disabled={disabled}
            aria-labelledby={`${name}-label`}
          />
        </div>
      </div>
    </div>
  );
}
