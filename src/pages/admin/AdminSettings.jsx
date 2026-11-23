import { useOutletContext } from "react-router-dom";
import { Info } from "lucide-react";
import { LoginContactSection } from "../../features/account/LoginContactSection";
import { PinSection } from "../../features/pin/PinSection";
import ui from "./styles/AdminUi.module.css";

/*
 * Admin → Settings: the admin's own login, like the teacher and school Settings pages.
 *   - Login email / WhatsApp / mobile: each added or changed with a code sent to the new
 *     address or number (signup user profile), only the channels the organisation has on.
 *   - PIN login on trusted devices (when the organisation has it switched on).
 */
const AdminSettings = () => {
  // serverJobsStatus "local" = the built-in local admin account: no signup user to change.
  const { currentUser = {}, serverJobsStatus } = useOutletContext();
  const localLogin = serverJobsStatus === "local";

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h2 className={ui.pageTitle}>Settings</h2>
          <p className={ui.pageSubtitle}>Your login email, WhatsApp and mobile number, and PIN login.</p>
        </div>
      </div>

      {localLogin ? (
        <div className={`${ui.notice} ${ui.noticeInfo}`} role="note">
          <Info size={16} aria-hidden="true" />
          <span>
            You're logged in with the local admin account, which has no login details to change. Log in with an
            ADMIN account (one-time code) to manage your login email, WhatsApp number and PIN.
          </span>
        </div>
      ) : (
        <>
          <LoginContactSection email={currentUser.email} whatsapp={currentUser.whatsapp} mobile={currentUser.phone} />
          <PinSection />
        </>
      )}
    </div>
  );
};

export default AdminSettings;
