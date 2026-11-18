import { useOutletContext, useNavigate } from "react-router-dom";
import { Calendar, Briefcase, CheckCircle2 } from "lucide-react";
import styles from "./styles/TeacherApplications.module.css";
import { Button } from "@cloudstrytech/ui-components";

/**
 * The teacher's applications from the application service (TeacherLayout loads them:
 * POST /applications/search with teacher_user_id). Withdraw is POST /applications/withdraw.
 */
const TeacherApplications = () => {
  const navigate = useNavigate();
  const { appliedJobs, applicationsStatus, refreshApplications, handleWithdraw } = useOutletContext();

  const withdraw = async (job) => {
    const role = job.role || job.title;
    if (!window.confirm(`Are you sure you want to withdraw your application for "${role}" at ${job.school || "this school"}?`)) {
      return;
    }
    if (await handleWithdraw(job)) alert("Application withdrawn.");
  };

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Applied Jobs</h2>
        <p className={styles.subtext}>
          Monitor your job application history and current status.
        </p>
      </div>

      {applicationsStatus === "error" && (
        <p className={styles.subtext} role="alert">
          Couldn't load your applications.{" "}
          <Button variant="text" onClick={() => refreshApplications()}>
            Try again
          </Button>
        </p>
      )}

      {applicationsStatus === "loading" && appliedJobs.length === 0 ? (
        <p className={styles.subtext}>Loading your applications…</p>
      ) : appliedJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <Briefcase size={40} className={styles.emptyIcon} />
          <p>You haven't submitted any job applications yet.</p>
           <Button
            variant="filled"
            onClick={() => navigate("/teacher/all-jobs")}
          >
            Find Teaching Jobs
          </Button>
        </div>
      ) : (
        <div className={styles.tableScrollWrap}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeadRow}>
                <th className={styles.th}>Job Role</th>
                <th className={styles.th}>School</th>
                <th className={styles.th}>Applied Date</th>
                <th className={styles.th}>Status</th>
                <th className={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appliedJobs.map((job) => {
                const displayDate = job.appliedDate
                  ? new Date(job.appliedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—";
                const status = job.status || "Under Review";
                // Only an open application can be withdrawn.
                const canWithdraw = !["Hired", "Rejected", "Withdrawn"].includes(status);

                return (
                  <tr key={job.id} className={styles.row}>
                    <td className={styles.tdRole}>
                      <div>
                        {job.role || job.title}
                        <span className={styles.typeTag}>
                          {job.type}
                        </span>
                      </div>
                    </td>
                    <td className={styles.tdSchool}>{job.school || "—"}</td>
                    <td className={styles.tdDate}>
                      <Calendar size={13} className={styles.dateIcon} />
                      {displayDate}
                    </td>
                    <td className={styles.tdStatus}>
                      <span className={`${styles.statusBadge} ${status === "Shortlisted" ? styles.statusShortlisted :
                        status === "Rejected" ? styles.statusRejected :
                          styles.statusDefault
                        }`}>
                        <CheckCircle2 size={12} className={styles.statusIcon} />
                        {status === "Rejected" ? "Feedback" : status}
                      </span>
                    </td>
                    <td className={styles.tdActions}>
                      <div className={styles.actionsRow}>
                        <Button
                          variant="text"
                          startIcon="eyeIcon"
                          onClick={() => navigate(`/teacher/jobs/${job.id}`)}
                          className={styles.viewJobButton}
                        >
                          View Job
                        </Button>

                        {canWithdraw && (
                          <Button
                            variant="text"
                            startIcon="deleteIcon"
                            onClick={() => withdraw(job)}
                            className={styles.withdrawButton}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TeacherApplications;
