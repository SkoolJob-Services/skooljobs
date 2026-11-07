import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  ArrowLeft, PauseCircle, Pencil, PlayCircle,
  Send, Trash2, X, XCircle, Share2,
} from "lucide-react";
import postjob from "../../../dropdown/School_module/postjob.json";
import { inputClass, labelClass } from "../../lib/formStyles";
import { toOptions } from "../../lib/selectOptions";
import { Input, Select } from "@cloudstrytech/ui-components";
import { validateFields } from "../../lib/textValidation";
import { updateJob, deleteJob } from "../../services/jobService";
import styles from "./styles/SchoolJobDetail.module.css";

const {
  Subject: subjectsRaw,
  Experience_required: experienceOptionsRaw,
  Employment_type: employmentTypes,
  Salary_range: salaryRangesRaw,
} = postjob;

const subjects = toOptions(subjectsRaw);
const experienceOptions = toOptions(experienceOptionsRaw);
const salaryRanges = toOptions(salaryRangesRaw);

const jobStatusChipStyle = {
  Active: { backgroundColor: "#f0fdf4", color: "#16a34a" },
  Draft: { backgroundColor: "#fffbeb", color: "#d97706" },
  Closed: { backgroundColor: "#f1f5f9", color: "#64748b" },
  Paused: { backgroundColor: "#fff7ed", color: "#f97316" },
  Scheduled: { backgroundColor: "#eff6ff", color: "#2563eb" },
};

const applicantStatusChipStyle = {
  "Not Reviewed": { backgroundColor: "#eff6ff", color: "#2563eb" },
  Reviewed: { backgroundColor: "#faf5ff", color: "#9333ea" },
  Applied: { backgroundColor: "#eff6ff", color: "#2563eb" },
  Shortlisted: { backgroundColor: "#f0fdf4", color: "#16a34a" },
  Rejected: { backgroundColor: "#fef2f2", color: "#ef4444" },
  Active: { backgroundColor: "#f0fdf4", color: "#16a34a" },
  Closed: { backgroundColor: "#fef2f2", color: "#ef4444" },
  Draft: { backgroundColor: "#f1f5f9", color: "#64748b" },
};

const SchoolJobDetail = () => {
  const jobId = useParams();
  const navigate = useNavigate();
  const { jobs, setJobs, applicants, interviews } = useOutletContext();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const job = jobs.find((j) => String(j.id) === String(jobId.jobId));

  if (!job) {
    return (
      <div className={styles.notFoundWrap}>
        <p className={styles.notFoundText}>Job not found.</p>
        <button type="button" onClick={() => navigate("/school/manage-jobs")}
          className={styles.notFoundBtn}>
          Back to Manage Jobs
        </button>
      </div>
    );
  }

  const candidates = applicants.filter((a) => a.jobTitle === job.title);
  const shortlisted = candidates.filter((a) => a.status === "Shortlisted").length;
  const rejected = candidates.filter((a) => a.status === "Rejected").length;
  const ivCount = interviews.filter((iv) => iv.jobTitle === job.title).length;

  // No backend field exists for job status (UpdateJobRequest has no
  // `status` property) - Activate/Pause/Close/Publish stay local-only
  // until the Job service exposes a status-transition capability.
  const setJobStatus = (status) =>
    setJobs((p) => p.map((j) => (j.id === job.id ? { ...j, status } : j)));

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this job? This cannot be undone.")) return;
    try {
      await deleteJob(job.id);
      setJobs((p) => p.filter((j) => j.id !== job.id));
      navigate("/school/manage-jobs");
    } catch (error) {
      console.error("Failed to delete job:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage ? `Failed to delete job: ${serverMessage}` : "Failed to delete job.");
    }
  };

  const openEdit = () => {
    setEditForm({
      title: job.title || "",
      roleType: job.roleType || "Teaching",
      subject: job.subject || "",
      experience: job.experience || "",
      vacancies: job.vacancies || "1",
      salaryRange: job.salaryRange || "",
      location: job.location || "",
      employmentType: job.employmentType || "",
      expiryDate: job.expiryDate || "",
      description: job.description || "",
      requirements: job.requirements || "",
      qualifications: job.qualifications || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title || !editForm.location || !editForm.employmentType) {
      alert("Job Title, Location and Employment Type are required.");
      return;
    }
    const { valid, errors } = validateFields({
      title: editForm.title,
      location: editForm.location,
      description: editForm.description,
      requirements: editForm.requirements,
      qualifications: editForm.qualifications,
    });
    if (!valid) {
      alert(Object.values(errors)[0]);
      return;
    }
    setSavingEdit(true);
    try {
      // UpdateJobRequest has no expiryDate/salaryRange/roleType fields -
      // those stay local-only (see mapJobResponse/SchoolLayout notes).
      await updateJob(job.id, {
        title: editForm.title,
        subject: editForm.subject,
        roleCategory: editForm.roleType,
        employmentType: editForm.employmentType,
        location: editForm.location,
        experienceRequired: editForm.experience,
        vacancies: editForm.vacancies ? Number(editForm.vacancies) : undefined,
        compensation: editForm.salaryRange,
        description: editForm.description,
        requirements: editForm.requirements,
        qualificationsRequired: editForm.qualifications
          ? editForm.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
          : [],
      });
      setJobs((p) => p.map((j) => (j.id === job.id ? { ...j, ...editForm } : j)));
      setEditOpen(false);
    } catch (error) {
      console.error("Failed to update job:", error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage ? `Failed to save job: ${serverMessage}` : "Failed to save job.");
    } finally {
      setSavingEdit(false);
    }
  };

  const setField = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  return (
    <div className={styles.page}>

      {/* ── Back + header ─────────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/school/manage-jobs")}
          className={styles.backBtn}
        >
          <ArrowLeft size={16} /> Back to Manage Jobs
        </button>

        <div className={styles.headerRow}>
          <div>
            <div className={styles.titleRow}>
              <h2 className={styles.titleText}>{job.title}</h2>
              <span
                className={styles.statusChip}
                style={jobStatusChipStyle[job.status] || { backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                {job.status}
              </span>
            </div>
            <div className={styles.metaRow}>
              {job.subject && <span>{job.subject}</span>}
              {job.location && <span>· {job.location}</span>}
              {job.employmentType && <span>· {job.employmentType}</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className={styles.quickActions}>
            <button type="button"
              onClick={() => {
                const shareLink = window.location.origin + "/public-job/" + job.id;
                navigator.clipboard.writeText(shareLink);
                alert(`Public sharing link copied to clipboard!\n${shareLink}`);
              }}
              className={styles.actionBtn}>
              <Share2 size={14} /> Share Link
            </button>
            <button type="button" onClick={openEdit}
              className={styles.actionBtn}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" onClick={handleDelete}
              className={styles.deleteBtn}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        {[
          { label: "Total Applied", value: candidates.length || job.applicants, color: styles.colorPrimary },
          { label: "Shortlisted", value: shortlisted, color: styles.colorGreen },
          { label: "Rejected", value: rejected, color: styles.colorRed },
          { label: "Interviews", value: ivCount, color: styles.colorBlue },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <p className={`${styles.statValue} ${s.color}`}>{s.value}</p>
            <p className={styles.statLabel}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>

        {/* ── Left: Candidates ──────────────────────────────────────────────── */}
        <div className={styles.candidatesCard}>
          <div className={styles.candidatesHeader}>
            <h3 className={styles.cardTitle}>Applicants for this Role ({candidates.length})</h3>
          </div>
          {candidates.length === 0 ? (
            <p className={styles.emptyText}>No applications received yet.</p>
          ) : (
            <div className={styles.candidatesList}>
              {candidates.map((a) => (
                <div key={a.id} className={styles.candidateRow}>
                  <img src={a.avatar} alt={a.name} className={styles.candidateAvatar} />
                  <div className={styles.candidateInfo}>
                    <p className={styles.candidateName}>{a.name}</p>
                    <p className={styles.candidateSub}>{a.experience} · {a.qualification}</p>
                  </div>
                  <span
                    className={styles.candidateStatus}
                    style={applicantStatusChipStyle[a.status] || { backgroundColor: "#f1f5f9", color: "#64748b" }}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Job info + status controls ─────────────────────────────── */}
        <div className={styles.sidebar}>

          {/* Job details */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>Job Details</h3>
            {[
              { label: "Posted", value: job.date },
              { label: "Expiry", value: job.expiryDate || "Not set" },
              { label: "Experience", value: job.experience || "—" },
              { label: "Vacancies", value: job.vacancies || "—" },
              { label: "Salary Range", value: job.salaryRange || "—" },
              { label: "Role Type", value: job.roleType || "—" },
            ].map((d) => (
              <div key={d.label} className={styles.infoRow}>
                <span className={styles.infoLabel}>{d.label}</span>
                <span className={styles.infoValue}>{d.value}</span>
              </div>
            ))}
          </div>

          {/* Hiring status controls */}
          <div className={styles.statusCard}>
            <h3 className={styles.statusCardTitle}>Hiring Status</h3>
            <div className={styles.statusBtnGroup}>
              {job.status !== "Active" && (
                <button type="button" onClick={() => setJobStatus("Active")}
                  className={`${styles.statusBtnBase} ${styles.btnActivate}`}>
                  <PlayCircle size={16} /> Activate Job
                </button>
              )}
              {job.status === "Active" && (
                <button type="button" onClick={() => setJobStatus("Paused")}
                  className={`${styles.statusBtnBase} ${styles.btnPause}`}>
                  <PauseCircle size={16} /> Pause Hiring
                </button>
              )}
              {job.status !== "Closed" && job.status !== "Draft" && (
                <button type="button" onClick={() => setJobStatus("Closed")}
                  className={`${styles.statusBtnBase} ${styles.btnClose}`}>
                  <XCircle size={16} /> Close Job
                </button>
              )}
              {job.status === "Draft" && (
                <button type="button" onClick={() => setJobStatus("Active")}
                  className={`${styles.statusBtnBase} ${styles.btnPublish}`}>
                  <Send size={16} /> Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Edit job modal ════════════════════════════════════════════════════ */}
      {editOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>

            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Edit Job</h3>
                <p className={styles.modalSubtitle}>{job.title}</p>
              </div>
              <button type="button" onClick={() => setEditOpen(false)} className={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Job Title <span className={styles.requiredMark}>*</span></label>
                <input value={editForm.title} onChange={(e) => setField("title", e.target.value)} className={inputClass} />
              </div>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Role Type</label>
                <div className={styles.pillRow}>
                  {["Teaching", "Administrative", "Teaching & Administrative"].map((t) => (
                    <button key={t} type="button" onClick={() => setField("roleType", t)}
                      className={editForm.roleType === t ? styles.pillBtnActive : styles.pillBtn}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(editForm.roleType === "Teaching" || editForm.roleType === "Teaching & Administrative") && (
                <div>
                  <label className={labelClass}>Subject</label>
                  <Select value={editForm.subject} onChange={(v) => setField("subject", v)} placeholder="Select Subject" options={subjects} />
                </div>
              )}

              <div>
                <label className={labelClass}>Experience Required</label>
                <Select value={editForm.experience} onChange={(v) => setField("experience", v)} placeholder="Select" options={experienceOptions} />
              </div>

              <div>
                <label className={labelClass}>Vacancies</label>
                <input type="number" min="1" value={editForm.vacancies} onChange={(e) => setField("vacancies", e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Salary Range</label>
                <Select value={editForm.salaryRange} onChange={(v) => setField("salaryRange", v)} placeholder="Select" options={salaryRanges} />
              </div>

              <div>
                <label className={labelClass}>Location <span className={styles.requiredMark}>*</span></label>
                <Input
                  value={editForm.location}
                  onChange={(value) => setField("location", value)}
                />              </div>

              <div>
                <label className={labelClass}>Expiry Date</label>
                <input type="date" value={editForm.expiryDate} onChange={(e) => setField("expiryDate", e.target.value)} className={inputClass} />
              </div>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Employment Type <span className={styles.requiredMark}>*</span></label>
                <div className={styles.pillRow}>
                  {employmentTypes.map((t) => (
                    <button key={t} type="button" onClick={() => setField("employmentType", t)}
                      className={editForm.employmentType === t ? styles.pillBtnActive : styles.pillBtn}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Job Description</label>
                <textarea value={editForm.description} onChange={(e) => setField("description", e.target.value)}
                  className={`${inputClass} ${styles.textareaSm}`} />
              </div>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Requirements</label>
                <textarea value={editForm.requirements} onChange={(e) => setField("requirements", e.target.value)}
                  className={`${inputClass} ${styles.textareaXs}`} />
              </div>

              <div className={styles.colSpan2}>
                <label className={labelClass}>Qualifications</label>
                <textarea value={editForm.qualifications} onChange={(e) => setField("qualifications", e.target.value)}
                  className={`${inputClass} ${styles.textareaXs}`} />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={() => setEditOpen(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className={styles.saveBtn}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolJobDetail;
