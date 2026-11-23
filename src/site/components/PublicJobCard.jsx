import { Link } from "react-router-dom";
import { useDocumentUrl } from "../../services/documentService";
import { postedLabel } from "../hooks/usePublicJobs";
import styles from "./PublicJobCard.module.css";

/**
 * Job card in the website's "Featured Teaching Jobs" style. The picture is the job's own image
 * when it has one (a URL or a stored document); without one the card has no picture, and the
 * employment type and location show above the title instead.
 */
export default function PublicJobCard({ job, to }) {
  const imageUrl = useDocumentUrl(job.image);
  const meta = [
    job.experience && { label: "Experience", value: job.experience },
    job.salary && { label: "Salary", value: job.salary },
    job.subject && { label: "Subject", value: job.subject },
  ].filter(Boolean);
  const tags = [job.roleCategory, ...job.qualifications].filter(Boolean).slice(0, 3);

  return (
    <article className={styles.card}>
      {imageUrl ? (
        <div className={styles.image}>
          <img src={imageUrl} alt="" loading="lazy" />
          <div className={styles.overlay} />
          {job.employmentType && <span className={styles.badge}>{job.employmentType}</span>}
          {job.location && <span className={styles.locationBadge}>{job.location}</span>}
        </div>
      ) : (
        (job.employmentType || job.location) && (
          <div className={styles.labelRow}>
            {job.employmentType && <span className={styles.label}>{job.employmentType}</span>}
            {job.location && <span className={styles.labelMuted}>{job.location}</span>}
          </div>
        )
      )}
      <div className={styles.content}>
        {job.subject && (
          <div className={styles.topline}>
            <span>{job.subject}</span>
          </div>
        )}
        <h3>{job.title}</h3>
        {job.school && <div className={styles.school}>{job.school}</div>}
        {meta.length > 0 && (
          <div className={styles.meta}>
            {meta.map((m) => (
              <div key={m.label}>
                <small>{m.label}</small>
                <strong title={m.value}>{m.value}</strong>
              </div>
            ))}
          </div>
        )}
        {job.description && <p className={styles.description}>{job.description}</p>}
        {tags.length > 0 && (
          <div className={styles.skills}>
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <div className={styles.footer}>
          <div className={styles.posted}>
            <strong>
              {job.applicants} application{job.applicants === 1 ? "" : "s"}
            </strong>
            <span>{postedLabel(job.postedDate)}</span>
          </div>
          <Link to={to} className={styles.btn}>
            View Job <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
