import { useOutletContext } from "react-router-dom";
import { Building2 } from "lucide-react";
import styles from "./styles/AdminSchools.module.css";

const AdminSchools = () => {
  // schools: every School Profile (GET /school-profiles), so schools without jobs are listed too.
  const { jobs, schools: registered = [] } = useOutletContext();

  const schoolMap = new Map();
  registered.forEach((sc) => {
    schoolMap.set(sc.name, { name: sc.name, email: sc.city || "", total: 0, pending: 0, approved: 0, live: 0, rejected: 0 });
  });
  jobs.forEach((job) => {
    const name = job.schoolName || "Unknown School";
    if (!schoolMap.has(name)) {
      schoolMap.set(name, {
        name,
        email: job.schoolEmail || "",
        total: 0,
        pending: 0,
        approved: 0,
        live: 0,
        rejected: 0,
      });
    }
    const entry = schoolMap.get(name);
    entry.total += 1;
    if (job.status === "Pending Approval") entry.pending += 1;
    if (job.status === "Approved") entry.approved += 1;
    if (job.status === "Active" || job.status === "Scheduled") entry.live += 1;
    if (job.status === "Rejected") entry.rejected += 1;
  });
  const schools = Array.from(schoolMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Schools</h2>
        <p className={styles.subtitle}>
          Every registered school, with the jobs it has submitted.
        </p>
      </div>

      {schools.length === 0 ? (
        <p className={styles.emptyText}>No schools yet.</p>
      ) : (
        <div className={styles.grid}>
          {schools.map((s) => (
            <div key={s.name} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.avatar}>
                  <Building2 size={18} />
                </div>
                <div className={styles.cardHeadText}>
                  <p className={styles.schoolName}>{s.name}</p>
                  {s.email && <p className={styles.schoolEmail}>{s.email}</p>}
                </div>
              </div>
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{s.total}</span>
                  <span className={styles.statLabel}>Total</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${styles.gold}`}>
                    {s.pending}
                  </span>
                  <span className={styles.statLabel}>Pending</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${styles.teal}`}>
                    {s.approved}
                  </span>
                  <span className={styles.statLabel}>Approved</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${styles.green}`}>
                    {s.live}
                  </span>
                  <span className={styles.statLabel}>Live</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${styles.rust}`}>
                    {s.rejected}
                  </span>
                  <span className={styles.statLabel}>Rejected</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSchools;
