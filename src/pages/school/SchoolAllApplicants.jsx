import { useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import {
  Bookmark, Calendar, ChevronRight, FileText, Search, X, CheckCircle2, XCircle, User,
} from "lucide-react";
import postjob from "../../../dropdown/School_module/postjob.json";
import applicantsOptions from "../../../dropdown/School_module/applicants.json";
import styles from "./styles/SchoolAllApplicants.module.css";
import { Select } from "@cloudstrytech/ui-components";
import { toOptions } from "../../lib/selectOptions";

const { Subject: subjectsRaw } = postjob;
const { Applicant_status: statusOptionsRaw, Experience_filter: experienceFilterOptionsRaw } = applicantsOptions;
const subjects = toOptions(subjectsRaw);
const statusOptions = toOptions(statusOptionsRaw);
const experienceFilterOptions = toOptions(experienceFilterOptionsRaw);

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
const defaultStatusChipStyle = { backgroundColor: "#f1f5f9", color: "#64748b" };

const SchoolAllApplicants = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applicants, setApplicants, handleSaveCandidate } = useOutletContext();

  const [applicantSearch, setApplicantSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [expFilter, setExpFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  // Pre-select status filter from the URL (e.g. ?status=Shortlisted from dashboard card)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [selected, setSelected] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Résumé and profile come only from the applicant's own details, captured from their teacher
  // profile when they applied (candidate.profile). Missing details show as empty: nothing made up.
  const getResumeData = (candidate) => {
    if (!candidate) return null;
    const p = candidate.profile || {};
    return {
      name: p.name || candidate.name || "",
      email: p.email || "",
      phone: p.phone || "",
      summary: p.summary || "",
      qualifications: p.qualifications || [],
      experiences: p.experiences || [],
      achievements: p.achievements || [],
    };
  };

  const resumeData = selected ? getResumeData(selected) : null;

  const getPublicProfileData = (candidate) => {
    if (!candidate) return null;
    const p = candidate.profile || {};
    const [first = "", ...rest] = (candidate.name || "").split(" ");
    return {
      title: p.title || "",
      firstName: p.firstName || first,
      lastName: p.lastName || rest.join(" "),
      currentJob: p.currentJob || "",
      city: p.city || "",
      age: p.age || "",
      mainSubject: p.mainSubject || candidate.subject || "",
      experience: candidate.experience || "",
      highestDeg: p.highestDegree || candidate.qualification || "",
      university: p.university || "",
      summary: p.summary || "",
      awards: p.achievements || [],
    };
  };

  const publicProfileData = selected ? getPublicProfileData(selected) : null;

  const uniqueJobTitles = toOptions([...new Set(applicants.map((a) => a.jobTitle))]);

  const filteredApplicants = applicants.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      a.subject.toLowerCase().includes(applicantSearch.toLowerCase());
    const matchSubject = !subjectFilter || a.subject === subjectFilter;
    const matchJob = !jobTitleFilter || a.jobTitle === jobTitleFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    const expYears = parseInt(a.experience) || 0;
    const matchExp =
      !expFilter ||
      (expFilter === "0-3" && expYears <= 3) ||
      (expFilter === "3-6" && expYears > 3 && expYears <= 6) ||
      (expFilter === "6+" && expYears > 6);
    return matchSearch && matchSubject && matchExp && matchJob && matchStatus;
  });

  const handleStatusChange = (id, status) => {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    if (selected?.id === id) setSelected((s) => ({ ...s, status }));
  };

  const handleSave = (id) => {
    handleSaveCandidate(id);
    if (selected?.id === id) setSelected((s) => ({ ...s, saved: !s.saved }));
  };

  const openDrawer = (applicant) => setSelected(applicant);
  const closeDrawer = () => setSelected(null);

  // Keep drawer in sync when applicant state changes (e.g. save toggled from table)
  const drawerApplicant = selected
    ? applicants.find((a) => a.id === selected.id) ?? selected
    : null;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>All Applicants</h2>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className={styles.filtersRow}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            value={applicantSearch}
            onChange={(e) => setApplicantSearch(e.target.value)}
            placeholder="Search by name or subject..."
            className={styles.searchInput}
          />
        </div>
        <Select
          options={uniqueJobTitles}
          value={jobTitleFilter}
          onChange={setJobTitleFilter}
          placeholder="All Job Titles"
          className={styles.filterPillJobTitle}
        />
        <Select
          value={subjectFilter}
          onChange={setSubjectFilter}
          placeholder="All Subjects"
          options={subjects}
          className={styles.filterPill}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={statusOptions}
          className={styles.filterPill}
        />
        <Select
          value={expFilter}
          onChange={setExpFilter}
          placeholder="All Experience"
          options={experienceFilterOptions}
          className={styles.filterPill}
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Candidate</th>
                <th className={styles.th}>Job Title</th>
                <th className={styles.th}>Subject</th>
                <th className={styles.th}>Experience</th>
                <th className={styles.th}>Status</th>
                <th className={styles.thNarrow} />
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {filteredApplicants.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No applicants found.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    onClick={() => openDrawer(applicant)}
                    className={selected?.id === applicant.id ? styles.trSelected : styles.tr}
                  >
                    <td className={styles.td}>
                      <div className={styles.candidateCell}>
                        <img src={applicant.avatar} alt={applicant.name} className={styles.candidateAvatar} />
                        <div className={styles.candidateInfo}>
                          <p className={styles.candidateName}>{applicant.name}</p>
                          <p className={styles.candidateQualification}>{applicant.qualification}</p>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tdMuted}>{applicant.jobTitle}</td>
                    <td className={styles.tdMuted}>{applicant.subject}</td>
                    <td className={styles.tdMuted}>{applicant.experience}</td>
                    <td className={styles.td}>
                      <span
                        className={styles.statusChip}
                        style={applicantStatusChipStyle[applicant.status] || defaultStatusChipStyle}
                      >
                        {applicant.status}
                      </span>
                    </td>
                    <td className={styles.tdChevron}>
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawer backdrop ───────────────────────────────────────────────── */}
      {drawerApplicant && (
        <div
          className={styles.drawerBackdrop}
          onClick={closeDrawer}
        />
      )}

      {/* ── Drawer panel ──────────────────────────────────────────────────── */}
      <div className={drawerApplicant ? styles.drawerOpen : styles.drawer}>
        {drawerApplicant && (
          <>
            {/* Drawer header */}
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerHeaderTitle}>Candidate Profile</h3>
              <button type="button" onClick={closeDrawer} className={styles.drawerCloseBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Drawer content */}
            <div className={styles.drawerContent}>

              {/* Profile card */}
              <div className={styles.profileCard}>
                <span
                  className={styles.profileStatusChip}
                  style={applicantStatusChipStyle[drawerApplicant.status] || defaultStatusChipStyle}
                >
                  {drawerApplicant.status}
                </span>
                <div className={styles.profileHeader}>
                  <img
                    src={drawerApplicant.avatar}
                    alt={drawerApplicant.name}
                    className={styles.profileAvatar}
                  />
                  <div className={styles.profileInfo}>
                    <h4 className={styles.profileName}>{drawerApplicant.name}</h4>
                    <p className={styles.profileJobTitle}>{drawerApplicant.jobTitle}</p>
                    <p className={styles.profileQualification}>{drawerApplicant.qualification}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className={styles.detailsGrid}>
                {[
                  { label: "Subject", value: drawerApplicant.subject },
                  { label: "Experience", value: drawerApplicant.experience },
                  { label: "Job Title", value: drawerApplicant.jobTitle },
                  { label: "Qualification", value: drawerApplicant.qualification },
                ].map((d) => (
                  <div key={d.label} className={styles.detailCard}>
                    <p className={styles.detailLabel}>{d.label}</p>
                    <p className={styles.detailValue}>{d.value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className={styles.actionsBlock}>
                <p className={styles.actionsLabel}>Actions</p>
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(drawerApplicant.id, "Shortlisted")}
                    className={drawerApplicant.status === "Shortlisted" ? styles.actionBtnShortlistActive : `${styles.actionBtn} ${styles.actionBtnShortlist}`}
                  >
                    <CheckCircle2 size={16} className={styles.actionBtnIcon} />
                    Shortlist
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSave(drawerApplicant.id)}
                    className={drawerApplicant.saved ? styles.actionBtnSaveActive : `${styles.actionBtn} ${styles.actionBtnSave}`}
                  >
                    <Bookmark size={16} className={drawerApplicant.saved ? styles.saveIconActive : styles.saveIconInactive} />
                    Save for later
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(drawerApplicant.id, "Rejected")}
                    className={drawerApplicant.status === "Rejected" ? styles.actionBtnRejectActive : `${styles.actionBtn} ${styles.actionBtnReject}`}
                  >
                    <XCircle size={16} className={styles.actionBtnIcon} />
                    Reject
                  </button>
                </div>
              </div>

              {/* Evaluation & Scheduling */}
              <div className={styles.evalBlock}>
                <p className={styles.actionsLabel}>Evaluation & Scheduling</p>
                <div className={styles.evalStack}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResumeModal(true);
                      if (drawerApplicant.status === "Not Reviewed") {
                        handleStatusChange(drawerApplicant.id, "Reviewed");
                      }
                    }}
                    className={styles.evalBtn}
                  >
                    <FileText size={16} className={styles.evalBtnIcon} /> View Resume
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(true);
                      if (drawerApplicant.status === "Not Reviewed") {
                        handleStatusChange(drawerApplicant.id, "Reviewed");
                      }
                    }}
                    className={styles.evalBtn}
                  >
                    <User size={16} className={styles.evalBtnIcon} /> View Public Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => { closeDrawer(); navigate("/school/interviews"); }}
                    className={styles.evalBtnSchedule}
                  >
                    <Calendar size={16} className={styles.evalBtnScheduleIcon} /> Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Resume Modal Overlay ─────────────────────────────────────────── */}
      {showResumeModal && resumeData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalHeaderIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className={styles.modalHeaderTitle}>Curriculum Vitae</h3>
                  <p className={styles.modalHeaderSubtitle}>{resumeData.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {/* Resume Details Content */}
            <div className={styles.modalBody}>
              {/* Header Card */}
              <div className={styles.resumeHeaderCard}>
                <h2 className={styles.resumeHeaderName}>{resumeData.name}</h2>
                <p className={styles.resumeHeaderSubtitle}>{drawerApplicant.jobTitle} · {drawerApplicant.subject}</p>
                <div className={styles.resumeHeaderMeta}>
                  {resumeData.email && <span>📧 {resumeData.email}</span>}
                  {resumeData.phone && <span>📞 {resumeData.phone}</span>}
                  {drawerApplicant.profile?.city && (
                    <span>📍 {drawerApplicant.profile.city}</span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionHeading}>Professional Summary</h3>
                <p className={styles.sectionBodyText}>
                  {resumeData.summary || "The applicant hasn't added a summary yet."}
                </p>
              </div>

              {/* Experience */}
              <div className={styles.sectionBlockLg}>
                <h3 className={styles.sectionHeading}>Work Experience</h3>
                {resumeData.experiences.length === 0 ? (
                  <p className={styles.emptyHint}>No professional experience listed.</p>
                ) : (
                  <div className={styles.experienceList}>
                    {resumeData.experiences.map((exp, idx) => (
                      <div key={idx} className={styles.experienceItem}>
                        <div className={styles.experienceDot} />
                        <div className={styles.experienceTopRow}>
                          <h4 className={styles.experienceJobTitle}>{exp.jobTitle}</h4>
                          <span className={styles.experienceYears}>{exp.startYear} - {exp.endYear || "Present"}</span>
                        </div>
                        <p className={styles.experienceSchool}>{exp.schoolName}</p>
                        {exp.details && <p className={styles.experienceDetails}>{exp.details}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Qualifications */}
              <div className={styles.sectionBlockLg}>
                <h3 className={styles.sectionHeading}>Education & Qualifications</h3>
                {resumeData.qualifications.length === 0 ? (
                  <p className={styles.emptyHint}>No educational qualifications listed.</p>
                ) : (
                  <div className={styles.qualificationsGrid}>
                    {resumeData.qualifications.map((qual, idx) => (
                      <div key={idx} className={styles.qualificationCard}>
                        <h4 className={styles.qualificationDegree}>{qual.degree}</h4>
                        <p className={styles.qualificationSchool}>{qual.school}</p>
                        <div className={styles.qualificationMetaRow}>
                          <span>Year: {qual.year}</span>
                          {qual.score && <span className={styles.qualificationScore}>{qual.score}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievements */}
              {resumeData.achievements && resumeData.achievements.length > 0 && (
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionHeading}>Awards & Certifications</h3>
                  <div className={styles.chipsRow}>
                    {resumeData.achievements.map((ach, idx) => (
                      <div key={idx} className={styles.chipCard}>
                        <p className={styles.chipCardTitle}>{ach.name}</p>
                        <p className={styles.chipCardSubtitle}>{ach.by} · {ach.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className={styles.modalFooterBtn}
              >
                Close CV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Public Profile Modal Overlay ─────────────────────────────────── */}
      {showProfileModal && publicProfileData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalHeaderIcon}>
                  <User size={20} />
                </div>
                <div>
                  <h3 className={styles.modalHeaderTitle}>Public Profile</h3>
                  <p className={styles.modalHeaderSubtitle}>{publicProfileData.firstName} {publicProfileData.lastName?.charAt(0)}.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Content */}
            <div className={styles.modalBody}>
              {/* Header Card */}
              <div className={styles.profileModalHeaderCard}>
                <div className={styles.profileModalBanner} />
                <div className={styles.profileModalBody}>
                  <div className={styles.profileModalAvatarRow}>
                    <div className={styles.profileModalAvatar}>
                      <User size={32} />
                    </div>
                    <div className={styles.profileModalInfo}>
                      <h4 className={styles.profileModalName}>
                        {publicProfileData.title} {publicProfileData.firstName} {publicProfileData.lastName?.charAt(0)}.
                      </h4>
                      <p className={styles.profileModalJobTitle}>
                        {publicProfileData.currentJob}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                {[
                  { label: "Age", value: publicProfileData.age },
                  { label: "Main Subject", value: publicProfileData.mainSubject },
                  { label: "Total Experience", value: publicProfileData.experience },
                  { label: "Highest Qualification", value: publicProfileData.highestDeg },
                  { label: "University", value: publicProfileData.university },
                  { label: "Area / City", value: publicProfileData.city },
                ].map((s) => (
                  <div key={s.label} className={styles.statCard}>
                    <p className={styles.statLabel}>{s.label}</p>
                    <p className={styles.statValue}>{s.value || "Not added"}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {publicProfileData.summary && (
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionHeading}>Professional Summary</h3>
                  <p className={styles.summaryText}>
                    {publicProfileData.summary}
                  </p>
                </div>
              )}

              {/* Awards */}
              {publicProfileData.awards && publicProfileData.awards.length > 0 && (
                <div className={styles.sectionBlock}>
                  <h3 className={styles.sectionHeading}>Public Awards</h3>
                  <div className={styles.chipsRow}>
                    {publicProfileData.awards.map((award, idx) => (
                      <div key={idx} className={styles.chipCard}>
                        <p className={styles.chipCardTitle}>{award.name || award.title}</p>
                        <p className={styles.chipCardSubtitle}>{award.by || award.issuer} · {award.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className={styles.modalFooterBtn}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolAllApplicants;
