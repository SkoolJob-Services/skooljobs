import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, CircularProgress, Input } from "@cloudstrytech/ui-components";
import { authApi, type InviteDetailsResponse } from "../../api";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { FormAlert } from "../../components/auth/FormAlert";
import { humanizeCode } from "../../lib/contact";
import { errorMessage } from "../../lib/errorMessages";
import { useFlow } from "../FlowContext";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; details: InviteDetailsResponse }
  | { status: "error"; message: string };

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Landing page for invite links: /invite?token=<invite token>. */
export function InvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { setPendingInvite } = useFlow();

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoad({ status: "error", message: "This invite link is incomplete. Open the link from your invitation again." });
      return;
    }
    let cancelled = false;
    setLoad({ status: "loading" });
    authApi
      .getInviteDetails(token)
      .then((details) => !cancelled && setLoad({ status: "ready", details }))
      .catch((error: unknown) => !cancelled && setLoad({ status: "error", message: errorMessage(error, "inviteDetails") }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (load.status === "loading") {
    return (
      <div className="page-center" role="status">
        <CircularProgress indeterminate aria-label="Loading invite" />
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <AuthLayout title="Invite unavailable" subtitle={load.message} footer={<p><Link to="/login">Go to login</Link></p>}>
        <p className="field-hint">If you think this is a mistake, ask the person who invited you to resend the invite.</p>
      </AuthLayout>
    );
  }

  const { details } = load;
  const expires = formatDate(details.expiresAt);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "Enter your first name.";
    else if (firstName.trim().length > 100) next.firstName = "Use 100 characters or fewer.";
    if (!lastName.trim()) next.lastName = "Enter your last name.";
    else if (lastName.trim().length > 100) next.lastName = "Use 100 characters or fewer.";
    setErrors(next);
    if (next.firstName || next.lastName) return;

    setSubmitting(true);
    try {
      const { sessionId } = await authApi.acceptInvite(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setPendingInvite({ token, details, firstName: firstName.trim(), lastName: lastName.trim(), sessionId });
      navigate("/invite/verify");
    } catch (error) {
      setFormError(errorMessage(error, "inviteAccept"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="You're invited"
      brandName={details.tenantName}
      brandLogoUrl={details.tenantLogoUrl || undefined}
      subtitle={
        <>
          {details.invitedByName ? <strong>{details.invitedByName}</strong> : "Someone"} invited you to join
          {details.tenantName ? <> <strong>{details.tenantName}</strong></> : " this organisation"}
          {details.role ? <> as <strong>{humanizeCode(details.role)}</strong></> : null}.
        </>
      }
      step="Step 1 of 2"
    >
      <dl className="invite-facts">
        {details.maskedTarget && (
          <>
            <dt>Code will be sent to</dt>
            <dd>{details.maskedTarget}</dd>
          </>
        )}
        {expires && (
          <>
            <dt>Invite expires</dt>
            <dd>{expires}</dd>
          </>
        )}
      </dl>
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <Input
            label="First name"
            name="firstName"
            value={firstName}
            onChange={(value: string) => {
              setFirstName(value);
              setErrors((prev) => ({ ...prev, firstName: undefined }));
            }}
            autoComplete="given-name"
            maxLength={100}
            error={errors.firstName}
            required
            disabled={submitting}
          />
          <Input
            label="Last name"
            name="lastName"
            value={lastName}
            onChange={(value: string) => {
              setLastName(value);
              setErrors((prev) => ({ ...prev, lastName: undefined }));
            }}
            autoComplete="family-name"
            maxLength={100}
            error={errors.lastName}
            required
            disabled={submitting}
          />
        </div>
        <FormAlert message={formError} />
        <Button type="submit" variant="filled" fullWidth loading={submitting} disabled={submitting}>
          Accept &amp; send code
        </Button>
      </form>
    </AuthLayout>
  );
}
