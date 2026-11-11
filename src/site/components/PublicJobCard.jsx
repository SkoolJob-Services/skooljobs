import { Link } from "react-router-dom";
import { unsplash } from "../siteConfig";
import { postedLabel } from "../hooks/usePublicJobs";
import styles from "./PublicJobCard.module.css";

// Classroom photos the website uses on its job cards; picked by subject.
const PHOTOS = [
  "1522202176988-66273c2fd55f",
  "1509062522246-3755977927d7",
  "1497486751825-1233686d5d80",
  "1513258496099-48168024aec0",
  "1577896851231-70ef18881754",
  "1544717305-2782549b5136",
];
const SUBJECT_PHOTO = {
  mathematics: 0,
  science: 1,
  physics: 1,
  chemistry: 1,
  biology: 1,
  english: 2,
  hindi: 2,
  computer: 4,
  "social science": 5,
  history: 5,
  geography: 5,
  economics: 5,
};

function photoFor(job, index) {
  const key = (job.subject || "").toLowerCase();
  return unsplash(PHOTOS[SUBJECT_PHOTO[key] ?? index % PHOTOS.length], 800);
}

/** Job card in the website's "Featured Teaching Jobs" style. */
export default function PublicJobCard({ job, index = 0, to }) {
  const meta = [
    job.experience && { label: "Experience", value: job.experience },
    job.salary && { label: "Salary", value: job.salary },
    job.subject && { label: "Subject", value: job.subject },
  ].filter(Boolean);
  const tags = [job.roleCategory, ...job.qualifications].filter(Boolean).slice(0, 3);

  return (
    <article className={styles.card}>
      <div className={styles.image}>
        <img src={photoFor(job, index)} alt="" loading="lazy" />
        <div className={styles.overlay} />
        {job.employmentType && <span className={styles.badge}>{job.employmentType}</span>}
        {job.location && <span className={styles.locationBadge}>{job.location}</span>}
      </div>
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
