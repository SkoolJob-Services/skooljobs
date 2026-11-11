import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, Clock, IndianRupee, MapPin, X } from "lucide-react";
import PageBanner from "../components/PageBanner";
import JobSearchForm from "../components/JobSearchForm";
import PublicJobCard from "../components/PublicJobCard";
import { filterJobs, postedLabel, usePublicJobs } from "../hooks/usePublicJobs";
import { useSiteLinks } from "../hooks/useSiteLinks";
import styles from "./JobsPage.module.css";

const FILTER_KEYS = ["q", "subject", "location", "experience"];

function JobDetail({ job, onClose, links }) {
  const applyTo = links.isTeacher ? links.jobDetail(job.id) : links.isAuthenticated ? null : "/login";
  return (
    <section className={styles.detail} aria-labelledby="job-detail-title">
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close job details">
        <X size={20} />
      </button>
      {job.subject && <span className={styles.detailSubject}>{job.subject}</span>}
      <h2 id="job-detail-title">{job.title}</h2>
      {job.school && <p className={styles.detailSchool}>{job.school}</p>}
      <ul className={styles.detailFacts}>
        {job.location && (
          <li>
            <MapPin size={16} /> {job.location}
          </li>
        )}
        {job.employmentType && (
          <li>
            <Briefcase size={16} /> {job.employmentType}
          </li>
        )}
        {job.experience && (
          <li>
            <Clock size={16} /> {job.experience}
          </li>
        )}
        {job.salary && (
          <li>
            <IndianRupee size={16} /> {job.salary}
          </li>
        )}
      </ul>
      {job.description && <p className={styles.detailText}>{job.description}</p>}
      {job.qualifications.length > 0 && (
        <>
          <h3>Qualifications</h3>
          <ul className={styles.detailList}>
            {job.qualifications.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.detailFooter}>
        <span>{postedLabel(job.postedDate)}</span>
        {applyTo && (
          <Link to={applyTo} state={{ from: `/jobs?job=${job.id}` }} className={styles.applyBtn}>
            {links.isTeacher ? "View & Apply" : "Login to Apply"}
          </Link>
        )}
      </div>
      {!links.isAuthenticated && (
        <p className={styles.detailHint}>
          New to SkoolJobs? <Link to="/signup">Create a free teacher account</Link> to apply.
        </p>
      )}
    </section>
  );
}

export default function JobsPage() {
  const [params, setParams] = useSearchParams();
  const links = useSiteLinks();
  const { jobs, loading, error } = usePublicJobs();

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ""])), [params]);
  const results = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const selectedId = params.get("job");
  const selected = selectedId ? jobs.find((j) => String(j.id) === selectedId) : null;
  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  useEffect(() => {
    if (selectedId) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  const search = (values) => {
    const next = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => v && next.set(k, v));
    setParams(next);
  };

  // Teachers open the job in their dashboard; everyone else sees it here, keeping the filters.
  const detailLink = (id) => {
    if (links.isAuthenticated) return links.jobDetail(id);
    const next = new URLSearchParams(params);
    next.set("job", id);
    return `/jobs?${next}`;
  };

  const closeJob = () => {
    const next = new URLSearchParams(params);
    next.delete("job");
    setParams(next);
  };

  return (
    <>
      <PageBanner tag="Now Hiring" title="Find Teaching Jobs">
        Verified teaching roles from schools across India. Filter by subject, city and experience to find the right
        classroom.
      </PageBanner>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.searchWrap}>
            <JobSearchForm key={params.toString()} initial={filters} onSearch={search} variant="page" />
          </div>

          {selected && <JobDetail job={selected} onClose={closeJob} links={links} />}

          {loading ? (
            <p className={styles.status} aria-busy="true">
              Loading jobs…
            </p>
          ) : error ? (
            <div className={styles.empty}>
              <h2>Job listings are unavailable right now</h2>
              <p>
                {links.isAuthenticated
                  ? "Please try again in a moment."
                  : "Sign in to browse every open teaching role, or try again in a moment."}
              </p>
              {!links.isAuthenticated && (
                <div className={styles.emptyActions}>
                  <Link to="/login" className={styles.applyBtn}>
                    Login
                  </Link>
                  <Link to="/signup" className={styles.outlineBtn}>
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={styles.resultsBar}>
                <p>
                  <strong>{results.length}</strong> job{results.length === 1 ? "" : "s"} found
                </p>
                {hasFilters && (
                  <button type="button" className={styles.clear} onClick={() => setParams(new URLSearchParams())}>
                    Clear filters
                  </button>
                )}
              </div>
              {results.length > 0 ? (
                <div className={styles.grid}>
                  {results.map((job, i) => (
                    <PublicJobCard key={job.id} job={job} index={i} to={detailLink(job.id)} />
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <h2>No jobs match your search</h2>
                  <p>Try a different subject or city, or clear the filters to see every open role.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
