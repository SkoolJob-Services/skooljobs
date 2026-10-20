import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Checkbox, Input, Select } from "@cloudstrytech/ui-components";
import { authApi } from "../../api";
import { statusOf } from "../../api/errors";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { PhoneField } from "../../components/auth/PhoneField";
import { DEFAULT_COUNTRY_CODE, humanizeCode, toE164 } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { useFlow } from "../FlowContext";
import { useTenant } from "../tenant/TenantContext";
import {
  requestedChannels,
  toSignupSessionRequest,
  validateSignup,
  type SignupFieldErrors,
  type SignupFormValues,
} from "./signupForm";

const EMPTY_FORM: SignupFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
  phoneNumber: "",
  whatsappSameAsPhone: true,
  whatsappCountryCode: DEFAULT_COUNTRY_CODE,
  whatsappNumber: "",
  signupType: "",
  verifyEmail: true,
  verifyPhone: false,
  verifyWhatsapp: false,
};

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signupAllowed, signupTypes } = useTenant();
  const { signupDraft, setSignupDraft, setPendingSignup } = useFlow();

  // signupType: fixed when the tenant offers one type or the link carries a valid ?type=,
  // otherwise the user picks from the tenant's selfSignupTypes. Roles are never chosen here.
  const typeFromUrl = useMemo(() => {
    const requested = searchParams.get("type")?.toUpperCase();
    return requested && signupTypes.includes(requested) ? requested : undefined;
  }, [searchParams, signupTypes]);
  const fixedType = typeFromUrl ?? (signupTypes.length === 1 ? signupTypes[0] : undefined);
  const showTypePicker = !fixedType && signupTypes.length > 1;

  const [values, setValues] = useState<SignupFormValues>(() => signupDraft ?? EMPTY_FORM);
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!signupAllowed) {
    return (
      <AuthLayout
        title="Signup by invitation only"
        subtitle="This organisation doesn't allow self-signup. Use the invite link you received, or log in if you already have an account."
      >
        <Button variant="filled" fullWidth onClick={() => navigate("/login")}>
          Go to login
        </Button>
      </AuthLayout>
    );
  }

  const hasEmail = values.email.trim() !== "";
  const hasPhone = toE164(values.phoneCountryCode, values.phoneNumber) !== "";
  const hasWhatsapp = values.whatsappSameAsPhone
    ? hasPhone
    : toE164(values.whatsappCountryCode, values.whatsappNumber) !== "";

  function update<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setConflict(false);

    const signupType = fixedType ?? values.signupType;
    const validation = validateSignup(
      { ...values, signupType },
      { requireSignupType: signupTypes.length > 0 },
    );
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;

    const request = toSignupSessionRequest(values, signupType);
    setSubmitting(true);
    try {
      const { sessionId } = await authApi.createSignupSession(request);
      setSignupDraft(values);
      setPendingSignup({ request, channels: requestedChannels(values), sessionId });
      navigate("/signup/verify");
    } catch (error) {
      setFormError(errorMessage(error, "signupStart"));
      setConflict(statusOf(error) === 409);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your teacher account"
      subtitle="Tell us who you are. We'll send a code to verify your contact details."
      audience="candidate"
      step="Step 1 of 2"
      footer={
        <>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
          <p>Schools join SkoolJobs through an invite from their administrator.</p>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        {fixedType && signupTypes.length > 1 && (
          <p className="signup-type-badge">Signing up as: {humanizeCode(fixedType)}</p>
        )}

        {showTypePicker && (
          <div className="field">
            <span className="field-label" id="signupType-label">
              I'm signing up as
            </span>
            <Select
              value={values.signupType}
              placeholder="Choose one"
              options={signupTypes.map((type) => ({ value: type, label: humanizeCode(type) }))}
              onChange={(value: string | string[]) => update("signupType", Array.isArray(value) ? value[0] ?? "" : value)}
              aria-labelledby="signupType-label"
              disabled={submitting}
            />
            {errors.signupType && <p className="field-error">{errors.signupType}</p>}
          </div>
        )}

        <div className="form-row">
          <Input
            label="First name"
            name="firstName"
            value={values.firstName}
            onChange={(value: string) => update("firstName", value)}
            autoComplete="given-name"
            maxLength={100}
            error={errors.firstName}
            required
            disabled={submitting}
          />
          <Input
            label="Last name"
            name="lastName"
            value={values.lastName}
            onChange={(value: string) => update("lastName", value)}
            autoComplete="family-name"
            maxLength={100}
            error={errors.lastName}
            required
            disabled={submitting}
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={(value: string) => update("email", value)}
          autoComplete="email"
          placeholder="john.doe@example.com"
          error={errors.email}
          disabled={submitting}
        />

        <PhoneField
          label="Phone"
          name="phone"
          countryCode={values.phoneCountryCode}
          number={values.phoneNumber}
          onCountryCodeChange={(value) => update("phoneCountryCode", value)}
          onNumberChange={(value) => update("phoneNumber", value)}
          error={errors.phoneNumber}
          disabled={submitting}
        />

        <div className="field">
          <Checkbox
            label="My WhatsApp number is the same as my phone"
            checked={values.whatsappSameAsPhone}
            onChange={(checked: boolean) => update("whatsappSameAsPhone", checked)}
            disabled={submitting}
          />
        </div>

        {!values.whatsappSameAsPhone && (
          <PhoneField
            label="WhatsApp number"
            name="whatsapp"
            countryCode={values.whatsappCountryCode}
            number={values.whatsappNumber}
            onCountryCodeChange={(value) => update("whatsappCountryCode", value)}
            onNumberChange={(value) => update("whatsappNumber", value)}
            error={errors.whatsappNumber}
            disabled={submitting}
          />
        )}

        <fieldset className="channel-group">
          <legend className="field-label">Send my verification code by</legend>
          <div className="channel-group__options">
            <Checkbox
              label="Email"
              checked={values.verifyEmail && hasEmail}
              onChange={(checked: boolean) => update("verifyEmail", checked)}
              disabled={submitting || !hasEmail}
            />
            <Checkbox
              label="SMS"
              checked={values.verifyPhone && hasPhone}
              onChange={(checked: boolean) => update("verifyPhone", checked)}
              disabled={submitting || !hasPhone}
            />
            <Checkbox
              label="WhatsApp"
              checked={values.verifyWhatsapp && hasWhatsapp}
              onChange={(checked: boolean) => update("verifyWhatsapp", checked)}
              disabled={submitting || !hasWhatsapp}
            />
          </div>
          <p className="field-hint">Options unlock once you enter that contact detail.</p>
        </fieldset>

        <FormAlert message={errors.form ?? formError} />
        {conflict && (
          <p className="inline-hint">
            <Link to="/login">Log in instead</Link>
          </p>
        )}

        <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting}>
          Send verification code
        </Button>
      </form>
    </AuthLayout>
  );
}
