import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@cloudstrytech/ui-components";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { useFlow } from "../FlowContext";
import { useTenant } from "../tenant/TenantContext";

/**
 * /signup/complete returns 202 (accepted for processing) rather than tokens,
 * so the account is created asynchronously and the user logs in afterwards.
 */
export function SignupDonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSignupDraft } = useFlow();
  const { pin } = useTenant();
  const { identifier, pinSaved } = (location.state ?? {}) as { identifier?: string; pinSaved?: boolean };

  return (
    <AuthLayout
      title="You're all set"
      subtitle={
        pinSaved
          ? "Your details are verified and your account is being created. It's usually ready within a few moments — then log in on this device with your PIN."
          : "Your details are verified and your account is being created. It's usually ready within a few moments."
      }
    >
      {pin.enabled && !pinSaved && (
        <p className="auth-card__subtitle">
          No PIN yet? After you log in with a code, you'll be asked to set one — or set it any time from Settings.
        </p>
      )}
      <Button
        variant="filled"
        fullWidth
        onClick={() => {
          setSignupDraft(null);
          navigate("/login", { replace: true, state: { identifier } });
        }}
      >
        Continue to login
      </Button>
    </AuthLayout>
  );
}
