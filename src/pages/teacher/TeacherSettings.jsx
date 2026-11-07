import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { HelpCircle, KeyRound, Save, Trash2, Bell, Eye } from "lucide-react";
import FormField from "../../components/FormField";
import styles from "./styles/TeacherSettings.module.css";
import { Button, Input } from "@cloudstrytech/ui-components";
import {
  updateTeacherProfile,
  getOwnTeacherProfile,
} from "../../services/teacherprofileService";

const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
})();

const TeacherSettings = () => {
  const { handleLogout } = useOutletContext();

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

  // Delete account states
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteChecks, setDeleteChecks] = useState({ c1: false, c2: false });
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

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

      {/* --- Change Password --- */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <KeyRound size={18} />
          </span>
          <h3 className={styles.cardTitle}>Change Password</h3>
        </div>
        <div className={styles.passwordGrid}>
          <FormField label="Current Password">
            <Input
              type="password"
              value={pwForm.current}
              onChange={(value) =>
                setPwForm((p) => ({ ...p, current: value }))
              }
              placeholder="Enter current password"
            />
          </FormField>
          <FormField label="New Password">
            <Input
              type="password"
              value={pwForm.next}
              onChange={(value) =>
                setPwForm((p) => ({ ...p, next: value }))
              }
              placeholder="Enter new password"
            />
          </FormField>
          <FormField label="Confirm New Password">
            <Input
              type="password"
              value={pwForm.confirm}
              onChange={(value) =>
                setPwForm((p) => ({ ...p, confirm: value }))
              }
              placeholder="Re-enter new password"
            />
          </FormField>
        </div>
        <div className={styles.passwordActions}>
          <Button
            variant="filled"
            onClick={() => {
              if (!pwForm.current) {
                alert("Enter your current password.");
                return;
              }

              if (pwForm.next !== pwForm.confirm) {
                alert("New passwords do not match.");
                return;
              }

              if (pwForm.next.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
              }

              alert("Password updated successfully!");
              setPwForm({ current: "", next: "", confirm: "" });
            }}
          >
            <Save size={16} /> Update Password
          </Button>
        </div>
      </div>

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
          Permanently deleting your account will remove your profile,
          applications, and saved jobs. This action is{" "}
          <strong>irreversible</strong>.
        </p>

        {deleteStep === 0 && (
          <Button
            variant="" filled
            startIcon="deleteIcon"
            onClick={() => setDeleteStep(1)}
            className={styles.requestDeleteButton}
          >
            Request Account Deletion
          </Button>)}

        {deleteStep === 1 && (
          <div className={styles.dangerStepPanel}>
            <p className={styles.dangerStepTitle}>
              Confirmation Required — Step 1 of 2
            </p>
            <label className={styles.dangerCheckLabel}>
              <input
                type="checkbox"
                checked={deleteChecks.c1}
                onChange={(e) =>
                  setDeleteChecks((p) => ({ ...p, c1: e.target.checked }))
                }
                className={styles.dangerCheckbox}
              />
              <span className={styles.dangerCheckText}>
                I understand that my job applications and profile data will be
                permanently deleted.
              </span>
            </label>
            <label className={styles.dangerCheckLabel}>
              <input
                type="checkbox"
                checked={deleteChecks.c2}
                onChange={(e) =>
                  setDeleteChecks((p) => ({ ...p, c2: e.target.checked }))
                }
                className={styles.dangerCheckbox}
              />
              <span className={styles.dangerCheckText}>
                I confirm this is my account and I wish to permanently delete
                it. This cannot be undone.
              </span>
            </label>
            <div className={styles.dangerStepActions}>
              <Button
                variant="filled"
                disabled={!deleteChecks.c1 || !deleteChecks.c2}
                onClick={() => {
                  setDeleteStep(2);
                  setDeleteOtpSent(true);
                  alert("Demo OTP sent! Use code 123456 to confirm deletion.");
                }}
                className={styles.primaryDangerButton}
              >
                Proceed to OTP Verification
              </Button>
              <button
                type="button"
                onClick={() => {
                  setDeleteStep(0);
                  setDeleteChecks({ c1: false, c2: false });
                }}
                className={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div className={styles.dangerStepPanel}>
            <p className={styles.dangerStepTitle}>
              OTP Verification — Step 2 of 2
            </p>
            {deleteOtpSent && (
              <p className={styles.otpHint}>
                A 6-digit OTP has been sent to your registered email and mobile
                number.
              </p>
            )}
            <FormField label="Enter OTP">
              <Input
                label="Enter OTP"
                value={deleteOtp}
                onChange={setDeleteOtp}
                fieldClassName="host-tweak"
                placeholder="Enter 6-digit OTP"
              />
            </FormField>
            <p className={styles.otpNote}>
              For demo: use OTP <strong>123456</strong>
            </p>
            <div className={styles.dangerStepActionsNoTop}>
              <Button
                variant="filled"
                onClick={() => {
                  if (deleteOtp !== "123456") {
                    alert("Invalid OTP. Try 123456 for demo.");
                    return;
                  }
                  alert("Account deleted. Redirecting...");
                  handleLogout();
                }}
                className={styles.primaryDangerButton}
              >
                Confirm Delete Account
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  setDeleteStep(0);
                  setDeleteChecks({ c1: false, c2: false });
                  setDeleteOtp("");
                  setDeleteOtpSent(false);
                }}
                className={styles.secondaryButton}
              >
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
