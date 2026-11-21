import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { HelpCircle, Save, Trash2, Bell, Eye } from "lucide-react";
import FormField from "../../components/FormField";
import styles from "./styles/TeacherSettings.module.css";
import { PinSection } from "../../features/pin/PinSection";
import { LoginContactSection } from "../../features/account/LoginContactSection";
import { normalizeTeacherProfile } from "../../features/teacher/ownTeacherProfile";
import { refreshUntil } from "../../lib/profileRefresh";
import { mockApiEnabled } from "../../api";
import { Button, Input, useSnackbar } from "@cloudstrytech/ui-components";
import {
  updateTeacherProfile,
  getOwnTeacherProfile,
  deleteOwnAccount,
} from "../../services/teacherprofileService";

const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
})();

const TeacherSettings = () => {
  // teacherProfile: GET /teachers/me (TeacherLayout), for the email and WhatsApp number shown.
  const { handleLogout, teacherProfile, applyTeacherProfile } = useOutletContext();

  // A verified email / WhatsApp / mobile change reaches the teacher profile through signup's
  // event a moment later: re-read it until the new value is there (PROFILE_REFRESH: wait
  // VITE_PROFILE_REFRESH_DELAY_MS before each read, at most VITE_PROFILE_REFRESH_ATTEMPTS reads),
  // so the other pages show it.
  const reloadProfileSoon = (change) => {
    if (!applyTeacherProfile || mockApiEnabled) return;
    const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    void refreshUntil(
      async () => (await getOwnTeacherProfile()).data,
      (data) => !change || same(normalizeTeacherProfile(data)?.[change.field], change.value),
    ).then(({ result, done }) => {
      if (done) applyTeacherProfile(result);
    });
  };

  // Settings state
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);

  // Loads the real saved preferences from the backend - this screen must
  // not show defaults as if they were the teacher's actual saved choice.
  useEffect(() => {
    if (!storedUser.id) return;
    let cancelled = false;
    getOwnTeacherProfile()
      .then(({ data }) => {
        if (cancelled || !data?.notificationPreferences) return;
        const prefs = data.notificationPreferences;
        setNotifPrefs((prev) => ({
          email: prefs.email ?? prev.email,
          sms: prefs.sms ?? prev.sms,
          push: prefs.push ?? prev.push,
        }));
      })
      .catch((error) => {
        if (!cancelled && error?.response?.status !== 404) {
          console.error("Failed to load notification preferences:", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveNotificationPreferences = async () => {
    if (!storedUser.id) {
      alert("Your session is missing a user id. Please log in again before saving.");
      return;
    }
    setSavingNotifPrefs(true);
    try {
      await updateTeacherProfile({
        teacherId: String(storedUser.id),
        teacher_user_id: String(storedUser.id),
        updated_sections: ["notificationPreferences"],
        notificationPreferences: {
          email: notifPrefs.email,
          sms: notifPrefs.sms,
          push: notifPrefs.push,
        },
      });
      alert("Notification preferences saved successfully");
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      alert("Failed to save notification preferences. Please try again.");
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  // Delete account: the teacher's login is suspended (signup) and the profile is marked DELETED;
  // the details are kept, so an administrator can reactivate the account later.
  const snackbar = useSnackbar();
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteChecks, setDeleteChecks] = useState({ c1: false, c2: false });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const resetDelete = () => {
    setDeleteStep(0);
    setDeleteChecks({ c1: false, c2: false });
    setDeleteConfirm("");
    setDeleteError("");
  };

  const confirmDelete = async () => {
    const teacherId = teacherProfile?.teacherId;
    if (!teacherId) {
      setDeleteError("Your profile hasn't loaded yet. Please try again in a moment.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteOwnAccount(teacherId);
      snackbar.show({
        message: "Your account is deleted. You can't log in with it any more.",
        type: "success",
      });
      handleLogout();
    } catch (error) {
      console.error("Account deletion failed:", error);
      setDeleteError(error?.response?.data?.message || "Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.pageTitle}>Account Settings</h2>

      {/* --- Privacy & Visibility --- */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <Eye size={18} />
          </span>
          <h3 className={styles.cardTitle}>
            Privacy &amp; Visibility
          </h3>
        </div>
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <p className={styles.toggleTitle}>Profile Visibility</p>
            <p className={styles.toggleDescription}>
              Allow verified schools to view your profile and contact you for
              teaching opportunities.
            </p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={isProfileVisible}
              onChange={() => setIsProfileVisible(!isProfileVisible)}
            />
            <div className={styles.switchTrack}></div>
          </label>
        </div>
      </div>

      {/* --- Notification Preferences --- */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <Bell size={18} />
          </span>
          <h3 className={styles.cardTitle}>
            Notification Preferences
          </h3>
        </div>
        <div className={styles.notificationList}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle}>Email Notifications</p>
              <p className={styles.toggleDescription}>
                Receive interview invites and job recommendations directly to
                your inbox.
              </p>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={notifPrefs.email}
                onChange={() =>
                  setNotifPrefs((p) => ({ ...p, email: !p.email }))
                }
              />
              <div className={styles.switchTrack}></div>
            </label>
          </div>
          <div className={styles.toggleRowBordered}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle}>SMS Alerts</p>
              <p className={styles.toggleDescription}>
                Get instant text alerts for critical updates like interview
                confirmations.
              </p>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={notifPrefs.sms}
                onChange={() => setNotifPrefs((p) => ({ ...p, sms: !p.sms }))}
              />
              <div className={styles.switchTrack}></div>
            </label>
          </div>
        </div>
        <div className={styles.passwordActions}>
          <Button
            variant="filled"
            disabled={savingNotifPrefs}
            onClick={saveNotificationPreferences}
          >
            <Save size={16} />{" "}
            {savingNotifPrefs ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>

      {/* --- Login email / WhatsApp / mobile, each changed with a code; only the tenant's login channels --- */}
      <LoginContactSection
        email={teacherProfile?.email}
        whatsapp={teacherProfile?.whatsapp}
        mobile={teacherProfile?.mobile}
        onChanged={reloadProfileSoon}
      />

      {/* --- PIN login (only when the organisation has it switched on) --- */}
      <PinSection />

      {/* --- Help & Support --- */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <HelpCircle size={18} />
          </span>
          <h3 className={styles.cardTitle}>
            Help &amp; Support
          </h3>
        </div>
        <div className={styles.faqGrid}>
          {[
            {
              q: "How do I apply for a job?",
              a: "Navigate to the 'All Jobs' section, click on a job card, and hit the 'Apply Now' button.",
            },
            {
              q: "How do I update my resume?",
              a: "Go to the 'Resume' tab in the sidebar where you can edit your skills and experience.",
            },
            {
              q: "Who can see my profile?",
              a: "If your profile visibility is ON, verified schools can discover you in their candidate search.",
            },
            {
              q: "How do I prepare for an interview?",
              a: "Check the 'Interviews' section for meeting links and preparation tips.",
            },
          ].map((faq) => (
            <div key={faq.q} className={styles.faqCard}>
              <p className={styles.faqQuestion}>{faq.q}</p>
              <p className={styles.faqAnswer}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
        <div className={styles.helpBanner}>
          <p className={styles.helpBannerTitle}>Need more help?</p>
          <p className={styles.helpBannerText}>
            Email us at{" "}
            <span className={styles.helpBannerEmail}>support@skooljobs.in</span>{" "}
            — we respond within 24 hours.
          </p>
        </div>
      </div>

      {/* --- Delete Account --- */}
      <div className={styles.dangerCard}>
        <div className={styles.dangerCardHeader}>
          <span className={styles.dangerIcon}>
            <Trash2 size={18} />
          </span>
          <h3 className={styles.dangerTitle}>Delete Account</h3>
        </div>
        <p className={styles.dangerDescription}>
          Deleting your account closes your login: you'll be logged out, you won't be able to log in
          with it again, and schools won't find your profile. Your details and applications are kept,
          so an administrator can restore the account if you ask.
        </p>

        {deleteStep === 0 && (
          <Button
            variant="filled"
            startIcon="deleteIcon"
            onClick={() => setDeleteStep(1)}
            className={styles.requestDeleteButton}
          >
            Request Account Deletion
          </Button>
        )}

        {deleteStep === 1 && (
          <div className={styles.dangerStepPanel}>
            <p className={styles.dangerStepTitle}>Confirmation Required — Step 1 of 2</p>
            <label className={styles.dangerCheckLabel}>
              <input
                type="checkbox"
                checked={deleteChecks.c1}
                onChange={(e) => setDeleteChecks((p) => ({ ...p, c1: e.target.checked }))}
                className={styles.dangerCheckbox}
              />
              <span className={styles.dangerCheckText}>
                I understand I'll be logged out and can't log in with this account (email,
                WhatsApp, mobile or PIN) any more.
              </span>
            </label>
            <label className={styles.dangerCheckLabel}>
              <input
                type="checkbox"
                checked={deleteChecks.c2}
                onChange={(e) => setDeleteChecks((p) => ({ ...p, c2: e.target.checked }))}
                className={styles.dangerCheckbox}
              />
              <span className={styles.dangerCheckText}>
                I understand schools will no longer find my profile or contact me.
              </span>
            </label>
            <div className={styles.dangerStepActions}>
              <Button
                variant="filled"
                disabled={!deleteChecks.c1 || !deleteChecks.c2}
                onClick={() => setDeleteStep(2)}
                className={styles.primaryDangerButton}
              >
                Continue
              </Button>
              <button type="button" onClick={resetDelete} className={styles.secondaryButton}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div className={styles.dangerStepPanel}>
            <p className={styles.dangerStepTitle}>Final Confirmation — Step 2 of 2</p>
            <FormField label="Type DELETE to confirm">
              <Input
                label="Type DELETE to confirm"
                value={deleteConfirm}
                onChange={(value) => {
                  setDeleteConfirm(value);
                  setDeleteError("");
                }}
                fieldClassName="host-tweak"
                placeholder="DELETE"
                disabled={deleting}
              />
            </FormField>
            {deleteError && (
              <p className={styles.otpNote} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.dangerStepActionsNoTop}>
              <Button
                variant="filled"
                onClick={() => void confirmDelete()}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                loading={deleting}
                className={styles.primaryDangerButton}
              >
                Delete My Account
              </Button>
              <Button variant="outlined" onClick={resetDelete} disabled={deleting} className={styles.secondaryButton}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSettings;
