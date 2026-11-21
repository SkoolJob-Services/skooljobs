import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { PlusCircle, Search } from "lucide-react";
import managejobsOptions from "../../../dropdown/School_module/managejobs.json";
import { Button, Select } from "@cloudstrytech/ui-components";
import { toOptions } from "../../lib/selectOptions";
import { changeJobStatus } from "../../services/jobService";
import styles from "../school/styles/SchoolManageJobs.module.css";

const jobStatusOptions = toOptions(managejobsOptions.Job_status);

const jobStatusChip = {
  Active: styles.statusActive,
  Draft: styles.statusDraft,
  Closed: styles.statusClosed,
  Paused: styles.statusPaused,
  Scheduled: styles.statusScheduled,
  "Pending Approval": styles.statusPending,
  Approved: styles.statusApproved,
  Rejected: styles.statusRejected,
};

const AdminManageJobs = () => {
  const navigate = useNavigate();
  // Every school's jobs from the job service, plus the jobs this browser keeps.
  const { jobs, setJobs, managedSchools, setServerJobs, refreshServerJobs, serverJobsStatus } = useOutletContext();
  const [busyId, setBusyId] = useState(null);

  const [jobSearch, setJobSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  const publishApprovedJob = (id) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: j.requestedStatus || "Active" } : j,
      ),
    );
  };

  /** Lifecycle change on the job service (POST /jobs/status), shown at once, reloaded shortly after. */
  const changeStatus = async (job, status, label) => {
    setBusyId(job.id);
    try {
      await changeJobStatus(job.id, status);
      setServerJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: label, serverStatus: status } : j)));
      setTimeout(() => refreshServerJobs(), 2000);
    } catch (error) {
      console.error("Job status change failed:", error);
      const message = error?.response?.data?.message;
      alert(message ? `Couldn't change the job: ${message}` : "Couldn't change the job. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  /** Actions a server job allows in its current status (same rules as the job service). */
  const serverActions = (job) => {
    const approved = job.review === "APPROVED";
    switch (job.serverStatus) {
      case "ACTIVE":
        return [["PAUSED", "Paused", "Pause"], ["CLOSED", "Closed", "Close"]];
      case "PAUSED":
        return [["ACTIVE", "Active", "Resume"], ["CLOSED", "Closed", "Close"]];
      case "SCHEDULED":
        return [["ACTIVE", "Active", "Publish Now"], ["CLOSED", "Closed", "Close"]];
      case "CLOSED":
      case "EXPIRED":
        return approved ? [["ACTIVE", "Active", "Reopen"]] : [];
      case "PENDING_APPROVAL":
      case "DRAFT":
        return [["CLOSED", "Closed", "Close"]];
      default:
        return [];
    }
  };

  const filteredJobs = jobs
    .filter((j) => (j.title || "").toLowerCase().includes(jobSearch.toLowerCase()))
    .filter((j) => !statusFilter || j.status === statusFilter)
    .filter((j) => !schoolFilter || j.schoolName === schoolFilter);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Manage Jobs</h2>
        <Button
          variant="filled"
          onClick={() => navigate("/admin/post-job")}
          className={styles.postJobButton}
          startIcon={<PlusCircle size={16} />}
        >
          Post New Job
        </Button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            placeholder="Search jobs..."
            className={styles.searchInput}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={jobStatusOptions}
        />
        <Select
          value={schoolFilter}
          onChange={setSchoolFilter}
          placeholder="All Schools"
          options={toOptions(managedSchools)}
        />
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Job Title</th>
                <th className={styles.th}>School</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Posted</th>
                <th className={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    {serverJobsStatus === "loading" ? "Loading jobs…" : "No jobs found."}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className={styles.row}>
                    <td className={styles.td}>
                      <p className={styles.tdTitle}>{job.title}</p>
                      {job.subject && (
                        <p className={styles.tdSubject}>{job.subject}</p>
                      )}
                    </td>
                    <td className={styles.tdMuted}>{job.schoolName || "—"}</td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusChip} ${jobStatusChip[job.status] || styles.statusDefault
                          }`}
                      >
                        {job.status}
                      </span>
                      {job.status === "Rejected" && job.rejectionReason && (
                        <p className={styles.tdSubject} title={job.rejectionReason}>
                          {job.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className={styles.tdLight}>{job.date}</td>
                    <td className={styles.tdActions}>
                      {job.fromServer && job.status === "Pending Approval" && (
                        <button
                          type="button"
                          onClick={() => navigate("/admin/job-approvals")}
                          className={styles.publishButton}
                        >
                          Review
                        </button>
                      )}
                      {job.fromServer &&
                        serverActions(job).map(([status, label, action]) => (
                          <button
                            key={status}
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => changeStatus(job, status, label)}
                            className={styles.publishButton}
                          >
                            {action}
                          </button>
                        ))}
                      {!job.fromServer && job.status === "Approved" && (
                        <button
                          type="button"
                          onClick={() => publishApprovedJob(job.id)}
                          className={styles.publishButton}
                          title="Publish Now"
                        >
                          Publish Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminManageJobs;
