import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@cloudstrytech/ui-components";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { useFlow } from "../FlowContext";

/**
 * /signup/complete returns 202 (accepted for processing) rather than tokens,
 * so the account is created asynchronously and the user logs in afterwards.
 */
export function SignupDonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSignupDraft } = useFlow();
  const identifier = (location.state as { identifier?: string } | null)?.identifier;

  return (
    <AuthLayout
      title="You're all set"
      subtitle="Your details are verified and your account is being created. It's usually ready within a few moments."
    >
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
