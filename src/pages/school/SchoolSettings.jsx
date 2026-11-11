import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button, Input } from "@cloudstrytech/ui-components";

import {
  HelpCircle,
  KeyRound,
  Trash2,
  Users,
  ShieldAlert,
  ArrowLeftRight,
  UserPlus,
  X,
  Pencil,
} from "lucide-react";
import FormField from "../../components/FormField";
import styles from "./styles/SchoolSettings.module.css";

const SchoolSettings = () => {
  const { handleLogout, currentUser } = useOutletContext();

  const isAdmin = !currentUser.isMember;

  // Manage members list from localStorage (excludes default admin owner)
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem("skooljobs_members");
    return saved ? JSON.parse(saved) : [];
  });

  // Delete account states
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteChecks, setDeleteChecks] = useState({ c1: false, c2: false });
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  // Member Form state (inline card)
  const [editingMember, setEditingMember] = useState(null); // null or { name, email, phone, memberRole, password }

  // OTP Verification state (inline card)
  const [otpState, setOtpState] = useState({
    isOpen: false,
    actionType: "", // "add" | "edit" | "delete" | "transfer"
    targetMemberId: null,
    formData: null,
    selectedPhone: "",
    otpSent: false,
    otpInput: "",
    error: "",
  });

  // Prepare members list containing Admin as the default row
  const adminRow = {
    id: "admin",
    name: currentUser.name || currentUser.companyName || "School Admin",
    email: currentUser.email || "hr@school.in",
    phone: currentUser.phone || "9999999999",
    memberRole: "Admin / Owner",
    isAdminRow: true
  };

  const allRows = [
    adminRow,
    ...members.map(m => ({
      ...m,
      memberRole: "Member",
      isAdminRow: false
    }))
  ];

  // Helper to trigger OTP verification inline
  const triggerOtpVerification = (actionType, targetId, formData = null) => {
    setOtpState({
      isOpen: true,
      actionType,
      targetMemberId: targetId,
      formData,
      selectedPhone: currentUser.phone || "9999999999", // Default to admin's phone
      otpSent: false,
      otpInput: "",
      error: "",
    });
  };

  const handleSendOtp = () => {
    setOtpState(prev => ({
      ...prev,
      otpSent: true,
      error: ""
    }));
    alert(`Demo OTP sent to ${otpState.selectedPhone}! Use code '123456' to verify.`);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpState.otpInput !== "123456") {
      setOtpState(prev => ({ ...prev, error: "Invalid OTP! Please use code '123456' for the demo." }));
      return;
    }

    const { actionType, targetMemberId, formData } = otpState;

    if (actionType === "add") {
      const newMember = {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        memberRole: "Member", // Restricted role
        password: formData.password,
        schoolEmail: currentUser.email,
        companyName: currentUser.companyName || currentUser.schoolName || currentUser.name || "",
      };
      const updated = [...members, newMember];
      setMembers(updated);
      localStorage.setItem("skooljobs_members", JSON.stringify(updated));
      setEditingMember(null);
      alert("Team member account created successfully!");
    }

    else if (actionType === "edit") {
      const updated = members.map(m => m.id === targetMemberId ? {
        ...m,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        memberRole: "Member", // Restricted role
        ...(formData.password ? { password: formData.password } : {})
      } : m);
      setMembers(updated);
      localStorage.setItem("skooljobs_members", JSON.stringify(updated));
      setEditingMember(null);
      alert("Team member details updated successfully!");
    }

    else if (actionType === "delete") {
      const updated = members.filter(m => m.id !== targetMemberId);
      setMembers(updated);
      localStorage.setItem("skooljobs_members", JSON.stringify(updated));
      alert("Team member account removed successfully!");
    }

    else if (actionType === "transfer") {
      const promotedMember = members.find(m => m.id === targetMemberId);
      if (!promotedMember) return;

      // 1. Create a demoted member object for the current Admin
      const demotedAdmin = {
        id: Date.now(),
        name: currentUser.name || "School Admin",
        email: currentUser.email,
        phone: currentUser.phone || "9999999999",
        memberRole: "Member", // demoted to Member
        password: currentUser.password || "password",
        schoolEmail: promotedMember.email,
        companyName: currentUser.companyName || currentUser.schoolName || "",
      };

      // 2. Add promoted member as Admin to users database
      const usersStr = localStorage.getItem("skooljobs_users") || "[]";
      const users = JSON.parse(usersStr);
      const newAdminUser = {
        firstName: promotedMember.name.split(" ")[0],
        lastName: promotedMember.name.split(" ").slice(1).join(" "),
        email: promotedMember.email,
        phone: promotedMember.phone,
        password: promotedMember.password,
        name: promotedMember.name,
        companyName: currentUser.companyName || currentUser.schoolName || "",
        role: "employer",
      };

      const filteredUsers = users.filter(u => u.email !== promotedMember.email);
      filteredUsers.push(newAdminUser);
      localStorage.setItem("skooljobs_users", JSON.stringify(filteredUsers));

      // 3. Update skooljobs_members: remove promoted member, add demoted admin, update schoolEmail parent references
      const otherMembers = members.filter(m => m.id !== promotedMember.id);
      const updatedMembers = [
        ...otherMembers.map(m => ({ ...m, schoolEmail: promotedMember.email })),
        demotedAdmin
      ];
      localStorage.setItem("skooljobs_members", JSON.stringify(updatedMembers));

      // 4. Log out session
      localStorage.removeItem("currentUser");
      setOtpState(prev => ({ ...prev, isOpen: false }));
      alert("Ownership transferred successfully! Logging out. Please log in using the new Admin credentials.");
      handleLogout();
      return;
    }

    setOtpState({
      isOpen: false,
      actionType: "",
      targetMemberId: null,
      formData: null,
      selectedPhone: "",
      otpSent: false,
      otpInput: "",
      error: "",
    });
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.pageTitle}>Settings</h2>

      {/* --- Member info for Non-Admins / Members --- */}
      {!isAdmin && (
        <div className={styles.card}>
          <span className={styles.cardIconShrink}>
            <Users size={22} />
          </span>
          <div>
            <h3 className={styles.cardTitle}>Member Account Settings</h3>
            <p className={styles.cardText}>
              You are signed in as a team member with the role: <span className={styles.cardTextHighlight}>{currentUser.memberRole || "Member"}</span>.
            </p>
            <p className={styles.cardNote}>
              Note: Team member accounts, member creation, and profile ownership configurations can only be managed by the primary School Admin ({currentUser.schoolEmail || "owner"}).
            </p>
          </div>
        </div>
      )}

      {/* --- Member Management (Admin Only) --- */}
      {isAdmin && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeaderLeft}>
              <span className={styles.sectionIcon}>
                <Users size={18} />
              </span>
              <div>
                <h3 className={styles.sectionTitle}>Team Members</h3>
                <p className={styles.sectionSubtitle}>Manage login credentials and access levels for your staff (Max 3 members).</p>
              </div>
            </div>
            <Button
              type="button"
              variant="filled"
              startIcon="userPlusIcon"
              disabled={members.length >= 3}
              onClick={() => {
                setEditingMember({
                  name: "",
                  email: "",
                  phone: "",
                  memberRole: "Member",
                  password: "",
                });
                setOtpState((prev) => ({ ...prev, isOpen: false }));
              }}
            >
              Add Member ({members.length}/3)
            </Button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={styles.tableHeadCell}>Name</th>
                  <th className={styles.tableHeadCell}>Email</th>
                  <th className={styles.tableHeadCell}>Mobile</th>
                  <th className={styles.tableHeadCell}>Role</th>
                  <th className={styles.tableHeadCellRight}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {allRows.map((m) => (
                  <tr key={m.id} className={styles.tableRow}>
                    <td className={styles.tableCellName}>{m.name}</td>
                    <td className={styles.tableCell}>{m.email}</td>
                    <td className={styles.tableCell}>{m.phone}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.roleBadge} ${m.isAdminRow
                        ? styles.roleBadgeAdmin
                        : styles.roleBadgeMember
                        }`}>
                        {m.memberRole}
                      </span>
                    </td>
                    <td className={styles.tableCellActions}>
                      {m.isAdminRow ? (
                        <span className={styles.primaryOwnerLabel}>Primary Owner</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(m);
                              setOtpState(prev => ({ ...prev, isOpen: false })); // Close OTP panel
                            }}
                            className={styles.rowActionButton}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerOtpVerification("transfer", m.id);
                            }}
                            className={styles.rowActionButtonAmber}
                          >
                            <ArrowLeftRight size={12} /> Transfer Ownership
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerOtpVerification("delete", m.id)}
                            className={styles.rowActionButtonRed}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- INLINE ADD / EDIT MEMBER FORM CARD --- */}
      {isAdmin && editingMember && (
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <h3 className={styles.formCardTitle}>
              <UserPlus className={styles.formCardTitleIcon} size={18} />
              {editingMember.id ? "Edit Team Member Details" : "Add New Team Member"}
            </h3>
            <button
              onClick={() => setEditingMember(null)}
              className={styles.formCardCloseButton}
            >
              <X size={16} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingMember.name || !editingMember.email || !editingMember.phone || (!editingMember.id && !editingMember.password)) {
                alert("Please fill in all required fields.");
                return;
              }
              triggerOtpVerification(editingMember.id ? "edit" : "add", editingMember.id, editingMember);
            }}
            className={styles.formGrid}
          >
            <div>
              <label className={styles.formFieldLabel}>Full Name *</label>
              <Input
                type="password"
                required={!editingMember.id}
                value={editingMember.password || ""}
                onChange={(value) =>
                  setEditingMember((p) => ({
                    ...p,
                    password: value,
                  }))
                }
                placeholder={editingMember.id ? "••••••••" : "Enter password"}
              />
            </div>
            <div>
              <label className={styles.formFieldLabel}>Email Address *</label>
              <Input
                type="email"
                required
                value={editingMember.email}
                onChange={(value) =>
                  setEditingMember((p) => ({
                    ...p,
                    email: value,
                  }))
                }
                placeholder="e.g. ritesh@school.in"
              />
            </div>
            <div>
              <label className={styles.formFieldLabel}>Mobile Number *</label>
              <Input
                type="email"
                required
                value={editingMember.email}
                onChange={(value) =>
                  setEditingMember((p) => ({
                    ...p,
                    email: value,
                  }))
                }
                placeholder="e.g. ritesh@school.in"
              />
            </div>
            <div>
              <label className={styles.formFieldLabel}>Role (Fixed) *</label>
              <Input
                type="text"
                disabled
                value="Member"
              />
            </div>
            <div className={styles.formGridFullSpan}>
              <label className={styles.formFieldLabel}>
                {editingMember.id ? "New Password (leave blank to keep current)" : "Password *"}
              </label>
              <Input
                type="password"
                required={!editingMember.id}
                value={editingMember.password || ""}
                onChange={(value) =>
                  setEditingMember((p) => ({
                    ...p,
                    password: value,
                  }))
                }
                placeholder={editingMember.id ? "••••••••" : "Enter password"}
              />
            </div>
            <div className={styles.formActionsRow}>
              <Button
                variant="outlined"
                type="button"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save &amp; Request OTP
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* --- INLINE OTP VERIFICATION CARD --- */}
      {isAdmin && otpState.isOpen && (
        <div className={styles.otpCard}>
          <div className={styles.otpCardHeader}>
            <div className={styles.otpCardHeaderLeft}>
              <span className={styles.otpCardIcon}>
                <ShieldAlert size={18} />
              </span>
              <h3 className={styles.otpCardTitle}>
                Security Verification ({otpState.actionType.toUpperCase()})
              </h3>
            </div>
            <button
              onClick={() => setOtpState(p => ({ ...p, isOpen: false }))}
              className={styles.otpCardCloseButton}
            >
              <X size={16} />
            </button>
          </div>

          {!otpState.otpSent ? (
            <div className={styles.otpBody}>
              <p className={styles.otpDescription}>
                To authorize this action, select where we should send the verification One-Time Passcode (OTP):
              </p>
              <div className={styles.otpDestGrid}>
                <label className={styles.otpDestOption}>
                  <Input
                    type="radio"
                    name="otpDest"
                    checked={otpState.selectedPhone === (currentUser.phone || "9999999999")}
                    onChange={() =>
                      setOtpState((p) => ({
                        ...p,
                        selectedPhone: currentUser.phone || "9999999999",
                      }))
                    }
                  /><div>
                    <p className={styles.otpDestLabel}>Admin's Number (You)</p>
                    <p className={styles.otpDestValue}>{currentUser.phone || "+91 99999 99999"}</p>
                  </div>
                </label>

                {/* If adding/editing, show the member phone inputted */}
                {otpState.formData?.phone && (
                  <label className={styles.otpDestOption}>
                    <Input
                      type="radio"
                      name="otpDest"
                      checked={otpState.selectedPhone === otpState.formData.phone}
                      onChange={() =>
                        setOtpState((p) => ({
                          ...p,
                          selectedPhone: otpState.formData.phone,
                        }))
                      }
                    />
                    <div>
                      <p className={styles.otpDestLabel}>Member's Number</p>
                      <p className={styles.otpDestValue}>{otpState.formData.phone}</p>
                    </div>
                  </label>
                )}

                {/* For Delete / Transfer, grab existing member's phone */}
                {(otpState.actionType === "delete" || otpState.actionType === "transfer") && (
                  (() => {
                    const mObj = members.find(m => m.id === otpState.targetMemberId);
                    return mObj && mObj.phone !== currentUser.phone ? (
                      <label className={styles.otpDestOption}>
                        <input
                          type="radio"
                          name="otpDest"
                          checked={otpState.selectedPhone === mObj.phone}
                          onChange={() => setOtpState(p => ({ ...p, selectedPhone: mObj.phone }))}
                          className={styles.otpDestRadio}
                        />
                        <div>
                          <p className={styles.otpDestLabel}>Member's Number</p>
                          <p className={styles.otpDestValue}>{mObj.phone}</p>
                        </div>
                      </label>
                    ) : null;
                  })()
                )}
              </div>

              <div className={styles.otpActionsRow}>
                <button
                  type="button"
                  onClick={() => setOtpState(p => ({ ...p, isOpen: false }))}
                  className={styles.otpSecondaryButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className={styles.otpPrimaryButton}
                >
                  Send OTP Code
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className={styles.otpForm}>
              <p className={styles.otpSentText}>
                OTP code has been simulated and sent to <strong className={styles.otpSentTextStrong}>{otpState.selectedPhone}</strong>.
              </p>
              <div className={styles.otpHintBox}>
                ℹ️ For demo verification, please use OTP code: <strong>123456</strong>
              </div>

              <FormField label="Enter Verification Code">
                <Input
                  type="text"
                  required
                  maxLength={6}
                  value={otpState.otpInput}
                  onChange={(value) =>
                    setOtpState((p) => ({
                      ...p,
                      otpInput: value,
                    }))
                  }
                  placeholder="Enter 6-digit OTP"
                />
              </FormField>

              {otpState.error && (
                <p className={styles.otpErrorText}>
                  ⚠️ {otpState.error}
                </p>
              )}

              <div className={styles.otpActionsRowBordered}>
                <button
                  type="button"
                  onClick={() => setOtpState(p => ({ ...p, otpSent: false, error: "" }))}
                  className={styles.otpSecondaryButton}
                >
                  ← Change Phone
                </button>
                <button
                  type="submit"
                  className={styles.otpPrimaryButton}
                >
                  Verify &amp; Confirm
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- Change Password --- */}
      <div className={styles.cardSimple}>
        <div className={styles.simpleHeader}>
          <span className={styles.simpleHeaderIcon}><KeyRound size={18} /></span>
          <h3 className={styles.simpleHeaderTitle}>Change Password</h3>
        </div>
        <div className={styles.passwordGrid}>
          <FormField label="Current Password">
            <Input
              type="password"
              value={pwForm.current}
              onChange={(value) =>
                setPwForm((p) => ({
                  ...p,
                  current: value,
                }))
              }
              placeholder="Enter current password"
            />          </FormField>
          <FormField label="New Password">
            <Input
              type="password"
              value={pwForm.next}
              onChange={(value) =>
                setPwForm((p) => ({
                  ...p,
                  next: value,
                }))
              }
              placeholder="Enter new password"
            />          </FormField>
          <FormField label="Confirm New Password">
            <Input
              type="password"
              value={pwForm.confirm}
              onChange={(value) =>
                setPwForm((p) => ({
                  ...p,
                  confirm: value,
                }))
              }
              placeholder="Re-enter new password"
            />          </FormField>
        </div>
        <div className={styles.passwordActions}>
          <Button
            type="button"
            variant="filled"
            startIcon="saveIcon"
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
            Update Password
          </Button>
        </div>
      </div>

      {/* --- Help & Support --- */}
      <div className={styles.cardSimple}>
        <div className={styles.simpleHeader}>
          <span className={styles.simpleHeaderIcon}><HelpCircle size={18} /></span>
          <h3 className={styles.simpleHeaderTitle}>Help &amp; Support</h3>
        </div>
        <div className={styles.faqGrid}>
          {[
            { q: "How do I post a job?", a: "Go to 'Post a New Job' in the sidebar, fill in the details and click Publish Job." },
            { q: "How do I shortlist candidates?", a: "Go to 'All Applicants', find a candidate and click the Shortlist button." },
            { q: "How do I view an applicant's resume?", a: "In All Applicants, click the Resume button next to any candidate's row." },
            { q: "How do I schedule an interview?", a: "Shortlist a candidate first, then go to Saved Candidates to coordinate." },
          ].map((faq) => (
            <div key={faq.q} className={styles.faqCard}>
              <p className={styles.faqQuestion}>{faq.q}</p>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </div>
          ))}
        </div>
        <div className={styles.helpBanner}>
          <p className={styles.helpBannerTitle}>Need more help?</p>
          <p className={styles.helpBannerText}>
            Email us at <span className={styles.helpBannerEmail}>support@skooljobs.in</span> — we respond within 24 hours.
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

export default SchoolSettings;
