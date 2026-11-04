import { Fragment, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronDown, ChevronUp, Info, Inbox, Search } from "lucide-react";
import { Button } from "@cloudstrytech/ui-components";
import managejobsOptions from "../../../dropdown/School_module/managejobs.json";
import { toOptions } from "../../lib/selectOptions";
import SelectOrOther from "../../components/ui/SelectOrOther";
import ui from "./styles/AdminUi.module.css";
import styles from "./styles/AdminJobApprovals.module.css";
import { APPROVED_STATUSES, PENDING, REJECTED, statusChipClass } from "./jobStatus";

const rejectionReasonOptions = toOptions(managejobsOptions.Rejection_reason);
const OTHER_VALUE = "Other";

const tabs = [
  { key: "pending", label: "Pending", match: (s) => s === PENDING },
  { key: "approved", label: "Approved", match: (s) => APPROVED_STATUSES.includes(s) },
  { key: "rejected", label: "Rejected", match: (s) => s === REJECTED },
];

const emptyCopy = {
  pending: ["Nothing waiting on review", "Jobs that schools send for approval will appear here."],
  approved: ["No approved jobs yet", "Jobs you approve will be listed here."],
  rejected: ["No rejected jobs", "Jobs you send back to a school will be listed here."],
};

const AdminJobApprovals = () => {
  const { jobs, setJobs } = useOutletContext();

  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonChoice, setReasonChoice] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [reasonError, setReasonError] = useState("");

  const tab = tabs.find((t) => t.key === activeTab);
  const query = search.trim().toLowerCase();
  const visibleJobs = jobs
    .filter((j) => tab.match(j.status))
    .filter(
      (j) =>
        !query ||
        [j.title, j.schoolName, j.location]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query)),
    )
    .sort((a, b) => a.id - b.id);

  const switchTab = (key) => {
    setActiveTab(key);
    setExpandedId(null);
    setRejectingId(null);
  };

  const approveJob = (id) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "Approved", rejectionReason: "" } : j)),
    );
    setExpandedId(null);
  };

  const startReject = (id) => {
    setExpandedId(id);
    setRejectingId(id);
    setReasonChoice("");
    setReasonOther("");
    setReasonError("");
  };

  const confirmReject = (id) => {
    const reason = reasonChoice === OTHER_VALUE ? reasonOther.trim() : reasonChoice;
    if (!reason) {
      setReasonError("Select or enter a reason for rejecting this job.");
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: REJECTED, rejectionReason: reason } : j)),
    );
    setRejectingId(null);
    setExpandedId(null);
  };

  const toggleDetails = (id) => {
    setExpandedId((current) => (current === id ? null : id));
    if (rejectingId === id) setRejectingId(null);
  };

  const [emptyTitle, emptyText] = query
    ? ["No matching jobs", "Try a different job title, school or location."]
    : emptyCopy[activeTab];

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h2 className={ui.pageTitle}>Job Approvals</h2>
          <p className={ui.pageSubtitle}>
            Review jobs submitted by schools. Approved jobs go back to the
            school to publish; rejected jobs are returned with your reason.
          </p>
        </div>
      </div>

      <div className={`${ui.notice} ${ui.noticeInfo}`} role="note">
        <Info size={16} aria-hidden="true" />
        <span>
          There's no job-approval API yet. Decisions are saved to the job list
          in this browser only and won't reach other devices or the server.
        </span>
      </div>

      <section className={ui.card}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Approval status">
            {tabs.map((t) => {
              const count = jobs.filter((j) => t.match(j.status)).length;
              const selected = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
                  onClick={() => switchTab(t.key)}
                >
                  {t.label}
                  <span className={styles.tabCount}>{count}</span>
                </button>
              );
            })}
          </div>

          <label className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <span className={styles.srOnly}>Search jobs</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, school or location"
              className={styles.searchInput}
            />
          </label>
        </div>

        {visibleJobs.length === 0 ? (
          <div className={ui.emptyState}>
            <span className={ui.emptyIcon}><Inbox size={20} /></span>
            <p className={ui.emptyTitle}>{emptyTitle}</p>
            <p className={ui.emptyText}>{emptyText}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Job</th>
                <th className={styles.th}>School</th>
                <th className={styles.th}>Location</th>
                <th className={styles.th}>Submitted</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thActions}`}>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((job) => {
                const expanded = expandedId === job.id;
                const isPending = job.status === PENDING;
                return (
                  <Fragment key={job.id}>
                    <tr className={`${styles.row} ${expanded ? styles.rowExpanded : ""}`}>
                      <td className={styles.td} data-label="Job">
                        <p className={styles.jobTitle}>{job.title}</p>
                        {(job.subject || job.employmentType) && (
                          <p className={styles.jobSub}>
                            {[job.subject, job.employmentType].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className={styles.td} data-label="School">{job.schoolName || "—"}</td>
                      <td className={styles.td} data-label="Location">{job.location || "—"}</td>
                      <td className={styles.td} data-label="Submitted">{job.date || "—"}</td>
                      <td className={styles.td} data-label="Status">
                        <span className={`${ui.chip} ${statusChipClass(job.status, ui)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdActions}`}>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={ui.linkButton}
                            onClick={() => toggleDetails(job.id)}
                            aria-expanded={expanded}
                            aria-controls={`job-details-${job.id}`}
                          >
                            {expanded ? "Hide" : "Review"}
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {isPending && (
                            <>
                              <Button variant="filled" onClick={() => approveJob(job.id)}>
                                Approve
                              </Button>
                              <Button variant="outlined" onClick={() => startReject(job.id)}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className={styles.detailRow} id={`job-details-${job.id}`}>
                        <td colSpan={6} className={styles.detailCell}>
                          <JobDetails job={job} />

                          {rejectingId === job.id && (
                            <div className={styles.rejectComposer}>
                              <p className={styles.rejectLabel}>
                                Reason for rejection — visible to the school
                              </p>
                              <SelectOrOther
                                value={reasonChoice}
                                onChange={(v) => {
                                  setReasonChoice(v);
                                  setReasonError("");
                                }}
                                placeholder="Select a reason"
                                options={rejectionReasonOptions}
                                otherValue={reasonOther}
                                onOtherChange={(v) => {
                                  setReasonOther(v);
                                  setReasonError("");
                                }}
                                otherPlaceholder="Describe the reason"
                              />
                              {reasonError && (
                                <p className={styles.fieldError} role="alert">{reasonError}</p>
                              )}
                              <div className={styles.rejectActions}>
                                <Button variant="filled" onClick={() => confirmReject(job.id)}>
                                  Confirm Rejection
                                </Button>
                                <Button variant="text" onClick={() => setRejectingId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

/** Fields the school filled in when posting the job; empty ones are skipped. */
const JobDetails = ({ job }) => {
  const facts = [
    ["Role type", job.roleType],
    ["Employment", job.employmentType],
    ["Experience", job.experience],
    ["Salary", job.salaryRange],
    ["Vacancies", job.vacancies],
    ["School email", job.schoolEmail],
    ["Publish as", job.requestedStatus],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <div className={styles.details}>
      {facts.length > 0 && (
        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt className={styles.factLabel}>{label}</dt>
              <dd className={styles.factValue}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {job.shortDescription && <p className={styles.description}>{job.shortDescription}</p>}
      {job.description && job.description !== job.shortDescription && (
        <p className={`${styles.description} ${styles.descriptionLong}`}>{job.description}</p>
      )}
      {job.status === REJECTED && job.rejectionReason && (
        <p className={styles.rejectionReason}>
          <strong>Rejection reason:</strong> {job.rejectionReason}
        </p>
      )}
      {facts.length === 0 && !job.shortDescription && !job.description && (
        <p className={styles.description}>No further details were provided for this job.</p>
      )}
    </div>
  );
};

export default AdminJobApprovals;
