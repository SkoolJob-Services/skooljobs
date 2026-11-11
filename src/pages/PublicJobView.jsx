import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { getJobById } from "../services/jobService";
import { config } from "../config/env";
import { SAMPLE_JOBS } from "../site/data/sampleJobs";
import SharedJobDetail from "../components/SharedJobDetail";
import styles from "./PublicJobView.module.css";

const PublicJobView = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // A shared link is opened by people who don't have the job in their browser: load it from the
  // Job Posting service (GET /jobs/{jobId}); the demo jobs in `npm run dev:mock`.
  const [result, setResult] = useState({ jobId: null, job: null });
  useEffect(() => {
    let cancelled = false;
    const load = config.useMockApi
      ? Promise.resolve(SAMPLE_JOBS.find((j) => String(j.id) === String(jobId)) || null).then(fromSample)
      : getJobById(jobId).then(({ data }) => fromJobResponse(data));
    load
      .catch((error) => {
        if (error?.response?.status !== 404) console.error("Failed to load job:", error);
        return null;
      })
      .then((job) => {
        if (!cancelled) setResult({ jobId, job });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);
  const loading = result.jobId !== jobId;
  const job = loading ? null : result.job;

  // Load currentUser to check role
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isLoggedIn = currentUser.id != null;
  const isCandidate = currentUser.role === "candidate";

  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (!isLoggedIn) {
      alert("Please log in or sign up as a Teacher to apply for this job.");
      navigate("/login", { state: { from: `/public-job/${jobId}` } });
      return;
    }
    if (!isCandidate) {
      alert("You are currently logged in as a School recruiter. Please sign in as a Teacher to apply.");
      return;
    }

    setApplied(true);
    alert("Success! Your teacher profile has been sent to the recruiter for review.");
  };

  if (loading) {
    return <div className={styles.notFoundWrap}>Loading job…</div>;
  }

  if (!job) {
    return (
      <div className={styles.notFoundWrap}>
        <Building2 size={64} className={styles.notFoundIcon} />
        <h2 className={styles.notFoundTitle}>Job Not Found</h2>
        <p className={styles.notFoundText}>
          The sharing link might be invalid, or this job post may have been removed by the school administration.
        </p>
        <Link
          to="/"
          className={styles.notFoundLink}
        >
          Back to SkoolJobs Home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Navbar branding */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <span className={styles.brandLogo}>
              SJ
            </span>
            <span className={styles.brandName}>
              SkoolJobs
            </span>
          </div>

          <div className={styles.navActions}>
            {isLoggedIn ? (
              <Link
                to={isCandidate ? "/teacher/dashboard" : "/school/dashboard"}
                className={styles.navLink}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  state={{ from: `/public-job/${jobId}` }}
                  className={styles.navLink}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className={styles.registerLink}
                >
                  Register as Teacher
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content wrapper */}
      <main className={styles.main}>
        <SharedJobDetail
          job={job}
          isApplied={applied}
          onApply={handleApply}
          onBack={() => window.history.back()}
          showSaveButton={false}
          showMatch={false}
        />
      </main>
    </div>
  );
};

export default PublicJobView;

/** JobResponse (job service) -> the fields SharedJobDetail shows. */
function fromJobResponse(j) {
  if (!j) return null;
  const qualifications = Array.isArray(j.qualificationsRequired)
    ? j.qualificationsRequired.join(", ")
    : j.qualificationsRequired;
  return {
    id: j.jobId,
    title: j.title,
    role: j.title,
    subject: j.subject,
    skill: j.subject,
    school: j.schoolName,
    companyName: j.schoolName,
    location: j.location,
    employmentType: j.employmentType,
    type: j.employmentType,
    experience: j.experienceRequired,
    salaryRange: j.compensation,
    salary: j.compensation,
    description: j.description,
    requirements: j.requirements,
    qualifications,
    vacancies: j.vacancies,
    expiryDate: j.expiryDate,
  };
}

/** A demo job (mock mode) in the same shape. */
function fromSample(j) {
  if (!j) return null;
  return {
    id: j.id,
    title: j.title,
    role: j.title,
    subject: j.subject,
    skill: j.subject,
    school: j.school,
    companyName: j.school,
    location: j.location,
    employmentType: j.employmentType,
    type: j.employmentType,
    experience: j.experience,
    salaryRange: j.salary,
    salary: j.salary,
    description: j.description,
    qualifications: j.qualifications.join(", "),
  };
}
