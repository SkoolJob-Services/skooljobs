import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button, Input, Select } from "@cloudstrytech/ui-components";

import {
  Calendar, Clock, Link2, MapPin, MessageCircle,
  PhoneCall, Video, X,
} from "lucide-react";
import { toOptions } from "../../lib/selectOptions";
import { validateFields } from "../../lib/textValidation";
import interviewsOptions from "../../../dropdown/School_module/interviews.json";
import styles from "./styles/SchoolInterviews.module.css";

const {
  Duration: DURATIONS_RAW,
  Round: ROUNDS_RAW,
  Status: STATUSES_RAW,
  Mode: INTERVIEW_MODES,
  Online_platform: ONLINE_PLATFORM_DATA,
} = interviewsOptions;

const DURATIONS = toOptions(DURATIONS_RAW);
const ROUNDS = toOptions(ROUNDS_RAW);
const STATUSES = toOptions(STATUSES_RAW);

// Online meeting platforms come from JSON; only the `val` key is renamed for
// readability (icons/colors are JSX and can't live in JSON, so they're mapped below).
const ONLINE_PLATFORMS = ONLINE_PLATFORM_DATA.map(({ value, needsLink, placeholder }) => ({
  val: value,
  needsLink,
  placeholder,
}));

// Interview mode icon/color — JSX can't live in JSON, so map it by the JSON `Mode` value.
const MODE_META = {
  Online: { icon: <Video size={15} />, color: styles.modeIconBlueText },
  "In-Person": { icon: <MapPin size={15} />, color: styles.modeIconOrangeText },
  Telephonic: { icon: <PhoneCall size={15} />, color: styles.modeIconGreenText },
};

const platformNeedsLink = (platform) =>
  ONLINE_PLATFORMS.find((p) => p.val === platform)?.needsLink ?? true;

// Reminders are only relevant for Online interviews
const REMINDERS_ENABLED_MODES = ["Online"];

const statusColor = {
  Scheduled: styles.statusScheduled,
  Confirmed: styles.statusConfirmed,
  Completed: styles.statusCompleted,
  Cancelled: styles.statusCancelled,
};

const blankForm = {
  round: "1st Round",
  date: "",
  time: "",
  duration: "45 Minutes",
  mode: "Online",
  onlinePlatform: "Google Meet",
  meetingLink: "",
  location: "",
  room: "",
  interviewer: "",
  notesForCandidate: "",
  internalNotes: "",
  remindConfirmation: true,
  remind24h: true,
  remind1h: true,
};

const Label = ({ children, required }) => (
  <p className={styles.label}>
    {children}{required && <span className={styles.labelRequiredMark}>*</span>}
  </p>
);

const inputCls = styles.input;

const SchoolInterviews = () => {
  const { applicants, interviews, setInterviews, schoolName } = useOutletContext();

  const shortlisted = applicants.filter((a) => a.status === "Shortlisted");

  const [schedulingFor, setSchedulingFor] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const scheduledIds = new Set(
    interviews.filter((iv) => iv.status !== "Cancelled").map((iv) => iv.candidateId),
  );

  const openSchedule = (applicant) => {
    setSchedulingFor(applicant);
    setForm(blankForm);
    setEditingId(null);
  };

  const openEdit = (iv) => {
    const applicant = applicants.find((a) => a.id === iv.candidateId) || {
      name: iv.candidateName, jobTitle: iv.jobTitle, id: iv.candidateId,
    };
    setSchedulingFor(applicant);
    setForm({
      round: iv.round, date: iv.date, time: iv.time, duration: iv.duration,
      mode: iv.mode, onlinePlatform: iv.onlinePlatform || "Google Meet",
      meetingLink: iv.meetingLink || "", location: iv.location || "",
      room: iv.room || "", interviewer: iv.interviewer,
      notesForCandidate: iv.notesForCandidate || "",
      internalNotes: iv.internalNotes || "",
      remindConfirmation: iv.remindConfirmation ?? true,
      remind24h: iv.remind24h ?? true,
      remind1h: iv.remind1h ?? true,
    });
    setEditingId(iv.id);
  };

  const handleSubmit = () => {
    if (!form.date || !form.time) { alert("Date and Time are required."); return; }
    if (form.mode === "Online" && platformNeedsLink(form.onlinePlatform) && !form.meetingLink) {
      alert(`Please add a Meeting Link for ${form.onlinePlatform} interviews.`);
      return;
    }
    const { valid, errors } = validateFields({
      notesForCandidate: form.notesForCandidate,
      internalNotes: form.internalNotes,
    });
    if (!valid) {
      alert(Object.values(errors)[0]);
      return;
    }

    if (editingId) {
      setInterviews((p) => p.map((iv) => iv.id === editingId ? { ...iv, ...form } : iv));
    } else {
      setInterviews((p) => [...p, {
        id: Date.now(),
        candidateId: schedulingFor.id,
        candidateName: schedulingFor.name,
        jobTitle: schedulingFor.jobTitle,
        subject: schedulingFor.subject,
        school: schoolName || "",
        status: "Scheduled",
        ...form,
      }]);
    }
    setSchedulingFor(null);
    setEditingId(null);
  };

  const updateStatus = (id, status) =>
    setInterviews((p) => p.map((iv) => iv.id === id ? { ...iv, status } : iv));

  const deleteInterview = (id) => {
    if (window.confirm("Remove this interview?"))
      setInterviews((p) => p.filter((iv) => iv.id !== id));
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Interview Schedule</h2>

      {/* ── Shortlisted candidates ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardHeaderTitle}>Shortlisted Candidates</h3>
          <p className={styles.cardHeaderSubtitle}>
            Only shortlisted candidates can be scheduled for an interview.
          </p>
        </div>

        {shortlisted.length === 0 ? (
          <p className={styles.emptyMessage}>
            No shortlisted candidates yet. Go to All Applicants and shortlist candidates first.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.tableShortlisted}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>Candidate</th>
                  <th className={styles.th}>Job Title</th>
                  <th className={styles.th}>Subject</th>
                  <th className={styles.th}>Experience</th>
                  <th className={styles.th}>Interview</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {shortlisted.map((a) => {
                  const isScheduled = scheduledIds.has(a.id);
                  return (
                    <tr key={a.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.candidateCell}>
                          <img src={a.avatar} alt={a.name} className={styles.candidateAvatar} />
                          <span className={styles.candidateName}>{a.name}</span>
                        </div>
                      </td>
                      <td className={styles.tdMuted}>{a.jobTitle}</td>
                      <td className={styles.tdMuted}>{a.subject}</td>
                      <td className={styles.tdMuted}>{a.experience}</td>
                      <td className={styles.td}>
                        {isScheduled ? (
                          <span className={styles.scheduledBadge}>
                            Scheduled ✓
                          </span>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => openSchedule(a)}
                          >
                            <Calendar size={13} /> Schedule Interview
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Scheduled interviews list ──────────────────────────────────────── */}
      {interviews.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardHeaderTitle}>All Scheduled Interviews</h3>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.tableScheduled}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>Candidate</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Date &amp; Time</th>
                  <th className={styles.th}>Mode</th>
                  <th className={styles.th}>Round</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {interviews.map((iv) => (
                  <tr key={iv.id} className={styles.tr}>
                    <td className={styles.tdBold}>{iv.candidateName}</td>
                    <td className={styles.tdMuted}>{iv.jobTitle}</td>
                    <td className={styles.td}>
                      <div className={styles.dateTimeCell}>
                        <Calendar size={13} className={styles.dateTimeIcon} /> {iv.date}
                        <Clock size={13} className={styles.timeIcon} /> {iv.time}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.modeCell}>
                        {iv.mode === "Online" && iv.onlinePlatform === "WhatsApp Video Call" && <MessageCircle size={13} className={styles.modeIconGreen} />}
                        {iv.mode === "Online" && iv.onlinePlatform !== "WhatsApp Video Call" && <Video size={13} className={styles.modeIconBlue} />}
                        {iv.mode === "In-Person" && <MapPin size={13} className={styles.modeIconOrange} />}
                        {iv.mode === "Telephonic" && <PhoneCall size={13} className={styles.modeIconGreen} />}
                        {iv.mode === "Online" ? iv.onlinePlatform || "Online" : iv.mode}
                      </span>
                    </td>
                    <td className={styles.tdMuted}>{iv.round}</td>
                    <td className={styles.td}>
                      <Select
                        value={iv.status}
                        onChange={(v) => updateStatus(iv.id, v)}
                        options={STATUSES}
                        className={`${styles.statusSelect} ${statusColor[iv.status] || styles.statusCompleted}`}
                      />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.rowActions}>
                        <Button
                          variant="outlined"
                          startIcon="pencilIcon"
                          type="button"
                          onClick={() => openEdit(iv)}
                        >
                          Edit
                        </Button>

                        {iv.status === "Scheduled" && (
                          <Button
                            variant="outlined"
                            startIcon="checkCircleIcon"
                            type="button"
                            onClick={() => updateStatus(iv.id, "Confirmed")}
                          >
                            Confirm
                          </Button>
                        )}

                        <Button
                          variant="outlined"
                          startIcon="xCircleIcon"
                          type="button"
                          onClick={() => deleteInterview(iv.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Schedule / Edit modal ════════════════════════════════════════════ */}
      {schedulingFor && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>

            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalHeaderIcon}>
                  <Calendar size={18} className={styles.modalHeaderIconSvg} />
                </div>
                <div>
                  <h3 className={styles.modalTitle}>
                    {editingId ? "Edit Interview" : "Schedule Interview"}
                  </h3>
                  <p className={styles.modalSubtitle}>{schedulingFor.name} · {schedulingFor.jobTitle}</p>
                </div>
              </div>
              <Button
                variant="text"
                type="button"
                onClick={() => setSchedulingFor(null)}
              >
                <X size={18} />
              </Button>
            </div>

            <div className={styles.modalBody}>

              {/* ── 1. Basic Information ─────────────────────────────────── */}
              <div className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>1</span>
                  <h4 className={styles.sectionTitle}>Basic Information</h4>
                </div>
                <div className={styles.sectionStack}>
                  <div>
                    <Label required>Candidate</Label>
                    <Input
                      value={schedulingFor.name}
                      readOnly
                    />                  </div>
                  <div>
                    <Label required>Job Posting</Label>
                    <Input
                      value={schedulingFor.jobTitle}
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Interviewer(s)</Label>
                    <Input
                      value={form.interviewer}
                      onChange={(value) => set("interviewer", value)}
                      placeholder="e.g. Priya Sharma (Academic Head)"
                    />
                  </div>
                  <div>
                    <Label required>Interview Round</Label>
                    <Select value={form.round} onChange={(v) => set("round", v)} options={ROUNDS} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* ── 2. Date, Time & Duration ─────────────────────────────── */}
              <div className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>2</span>
                  <h4 className={styles.sectionTitle}>Date, Time &amp; Duration</h4>
                </div>
                <div className={styles.sectionStack}>
                  <div>
                    <Label required>Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(value) => set("date", value)}
                    />                  </div>
                  <div>
                    <Label required>Time</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(value) => set("time", value)}
                    />
                  </div>
                  <div>
                    <Label required>Duration</Label>
                    <Select value={form.duration} onChange={(v) => set("duration", v)} options={DURATIONS} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* ── 3. Interview Mode ────────────────────────────────────── */}
              <div className={styles.section}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>3</span>
                  <h4 className={styles.sectionTitle}>Interview Mode</h4>
                </div>
                <div className={styles.modeStack}>
                  {INTERVIEW_MODES.map((val) => {
                    const { icon, color } = MODE_META[val] || {};
                    return (
                      <label key={val} className={`${styles.modeOption} ${form.mode === val ? styles.modeOptionActive : ""}`}>
                        <Input
                          type="radio"
                          name="mode"
                          value={val}
                          checked={form.mode === val}
                          onChange={() => set("mode", val)}
                        />                      <span className={color}>{icon}</span>
                        <span className={styles.modeLabel}>{val}</span>
                      </label>
                    );
                  })}

                  {form.mode === "Online" && (
                    <div className={styles.onlinePanel}>
                      <div>
                        <Label required>Platform</Label>
                        <div className={styles.platformGrid}>
                          {ONLINE_PLATFORMS.map((p) => {
                            const isWhatsApp = p.val === "WhatsApp Video Call";
                            return (
                              <Button
                                key={p.val}
                                type="button"
                                onClick={() => set("onlinePlatform", p.val)}
                                variant={
                                  form.onlinePlatform === p.val ? "default" : "outlined"
                                }
                              >
                                {isWhatsApp ? (
                                  <MessageCircle size={14} className={styles.platformIconGreen} />
                                ) : (
                                  <Video size={14} className={styles.platformIconBlue} />
                                )}
                                {p.val}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {platformNeedsLink(form.onlinePlatform) ? (
                        <div>
                          <Label required>Meeting Link</Label>
                          <div className={styles.meetingLinkBox}>
                            <Link2 size={15} className={styles.meetingLinkIcon} />
                            <Input
                              value={form.meetingLink}
                              onChange={(value) => set("meetingLink", value)}
                              placeholder={
                                ONLINE_PLATFORMS.find((p) => p.val === form.onlinePlatform)?.placeholder
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noLinkNotice}>
                          <MessageCircle size={15} className={styles.noLinkIcon} />
                          <p className={styles.noLinkText}>
                            No meeting link needed. The interviewer will call the candidate on
                            their registered WhatsApp number at the scheduled time.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {form.mode === "In-Person" && (
                    <div className={styles.inPersonPanel}>
                      <p className={styles.inPersonPanelTitle}>In-Person Details</p>
                      <div>
                        <Label>Location / Address</Label>
                        <Input value={form.location} onChange={(value) => set("location", value)} className={inputCls} placeholder="e.g. Delhi Public School, Sector-45" />
                      </div>
                      <div>
                        <Label>Room / Venue</Label>
                        <Input value={form.room} onChange={(value) => set("room", value)} className={inputCls} placeholder="e.g. Conference Room – 2" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 4. Reminder Settings ─────────────────────────────────── */}
              {(() => {
                const remindersEnabled = REMINDERS_ENABLED_MODES.includes(form.mode);
                return (
                  <div className={styles.section}>
                    <div className={styles.sectionHeading}>
                      <span className={styles.sectionNumber}>4</span>
                      <h4 className={styles.sectionTitle}>Reminder Settings</h4>
                    </div>

                    {!remindersEnabled && (
                      <p className={styles.reminderDisabledNotice}>
                        Automated reminders are only available for Online interviews.
                        For {form.mode} interviews, please coordinate with the candidate directly.
                      </p>
                    )}

                    <div className={`${styles.reminderStack} ${remindersEnabled ? "" : styles.reminderStackDisabled}`}>
                      {[
                        { key: "remindConfirmation", label: "Send Confirmation to Candidate", sub: "Immediately after scheduling" },
                        { key: "remind24h", label: "24 Hour Reminder", sub: "Before interview" },
                        { key: "remind1h", label: "1 Hour Reminder", sub: "Before interview" },
                      ].map(({ key, label, sub }) => (
                        <label key={key} className={styles.reminderOption}>
                          <Input
                            type="checkbox"
                            checked={remindersEnabled && form[key]}
                            disabled={!remindersEnabled}
                            onChange={(checked) => set(key, checked)}
                          />
                          <div>
                            <p className={styles.reminderLabel}>{label}</p>
                            <p className={styles.reminderSub}>{sub}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── 5. Notes (full width) ────────────────────────────────── */}
              <div className={styles.sectionFullWidth}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>5</span>
                  <h4 className={styles.sectionTitle}>Additional Notes</h4>
                </div>
                <div className={styles.notesGrid}>
                  <div>
                    <Label>Notes for Candidate</Label>
                    <textarea
                      value={form.notesForCandidate}
                      onChange={(e) => set("notesForCandidate", e.target.value)}
                      rows={3}
                      placeholder="Bring original certificates, Demo class may be required..."
                      className={styles.textarea}
                    />
                  </div>
                  <div>
                    <Label>Internal Notes <span className={styles.labelHint}>(Visible to HR only)</span></Label>
                    <textarea
                      value={form.internalNotes}
                      onChange={(e) => set("internalNotes", e.target.value)}
                      rows={3}
                      placeholder="Add internal notes here..."
                      className={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <Button
                variant="outlined"
                type="button"
                onClick={() => setSchedulingFor(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
              >
                {editingId ? "Save Changes" : "Schedule Interview"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolInterviews;
