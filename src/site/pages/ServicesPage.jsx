import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageBanner from "../components/PageBanner";
import { usePublicJobs } from "../hooks/usePublicJobs";
import { useSiteLinks } from "../hooks/useSiteLinks";
import styles from "./ServicesPage.module.css";

// Shown in the "Latest Teaching Jobs" ticker until live jobs load.
const SAMPLE_TICKER = [
  { title: "PGT Physics", meta: "Delhi · 5+ years", status: "Hiring" },
  { title: "TGT English", meta: "Pune · 2+ years", status: "New" },
  { title: "PRT Mathematics", meta: "Jaipur · 1+ year", status: "Open" },
  { title: "PGT Chemistry", meta: "Bengaluru · 4+ years", status: "Hiring" },
  { title: "Computer Teacher", meta: "Hyderabad · Freshers", status: "New" },
];

const SCHOOL_CARDS = [
  {
    icon: "+",
    small: "Hiring",
    title: "Post a Vacancy",
    heading: "Reach Pre-Screened Teachers Faster",
    text: "List a role in minutes and reach verified teaching talent. Create compelling job posts with our intelligent JD Builder and attract candidates who best fit your requirements.",
    points: ["Pre-screened talent pool", "Built-in JD Builder", "Live in minutes"],
    note: "Fill in your vacancy, then a quick registration to publish it our team sends your posting link right away.",
    cta: "Post a Vacancy",
    ctaKey: "postVacancy",
  },
  {
    icon: "✓",
    small: "Verification",
    title: "Background Check (BGC)",
    heading: "Verify Before You Offer",
    text: "A resume tells you who a candidate is. Verification tells you whether the information is accurate. We help validate academic qualifications and employment history through a secure, consent-based process.",
    points: ["University-verified degrees", "Previous-employer checks", "Discreet & consent-led"],
    note: "A robust process and trusted channel partners deliver dependable, confidential results.",
    cta: "Contact us",
    to: "/contact",
  },
  {
    icon: "↗",
    small: "Quick Cover",
    title: "Ad-hoc & Contractual",
    heading: "The Right Talent With Flexibility",
    text: "Need substitute, short-term or contract staff? We have registered educators who are qualified, certified and verified for exactly these roles, ready when you are.",
    points: ["Qualified & certified", "Already verified", "Confidential hiring support"],
    note: "Hiring confidentially? We handle it with discretion.",
    cta: "Contact us",
    to: "/contact",
  },
];

function JobTicker() {
  const { jobs } = usePublicJobs();
  const items = jobs.length
    ? jobs.slice(0, 5).map((j) => ({
        title: j.title,
        meta: [j.location, j.experience].filter(Boolean).join(" · "),
        status: j.employmentType || "Hiring",
      }))
    : SAMPLE_TICKER;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % items.length), 2600);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div className={styles.jobFlash}>
      <div className={styles.jobFlashHead}>
        <span className={styles.liveDot} />
        <small>Latest Teaching Jobs</small>
      </div>
      <div className={styles.jobWindow} aria-live="polite">
        {items.map((job, i) => (
          <div
            key={`${job.title}-${i}`}
            className={`${styles.jobMini} ${i === active % items.length ? styles.jobMiniActive : ""}`}
            aria-hidden={i !== active % items.length}
          >
            <div className={styles.jobMiniTop}>
              <strong>{job.title}</strong>
              <span className={styles.jobStatus}>{job.status}</span>
            </div>
            <p>{job.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const links = useSiteLinks();

  return (
    <>
      <PageBanner variant="gradient" tag="What We Make Possible" title="One Platform that Caters Educators and Schools">
        Skooljobs brings schools and education professionals together through Smart hiring solutions, Career
        opportunities, Skill development programmes, and Recruitment support. Designed exclusively for the Bhartiya
        Education Ecosystem.
      </PageBanner>

      {/* ---------- For teachers ---------- */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <span>For Teachers</span>
            <h2>Find your place, and grow in it</h2>
            <p>
              Tools that take you from searching for a role to standing out for it and keep you learning along the way.
            </p>
          </div>

          <div className={styles.teacherGrid}>
            <Link to={links.findJobs} className={styles.teacherCard}>
              <div className={styles.icon}>🔍</div>
              <h3>Job Search</h3>
              <h4>Find Verified Teaching Jobs</h4>
              <p>
                Every opening is screened at the first level before it goes live, so you are browsing real, relevant
                jobs. Narrow down in a few words to reach the right ones fast.
              </p>
              <ul>
                <li>First-level screened</li>
                <li>Real, current openings</li>
                <li>Filter in seconds</li>
              </ul>
              <JobTicker />
            </Link>

            <Link to="/resume-builder" className={styles.teacherCard}>
              <div className={styles.icon}>📄</div>
              <h3>Resume Builder</h3>
              <h4>A Resume That Puts You Ahead</h4>
              <p>
                Create a professional resume that conveys your qualifications, subjects, teaching journey, and
                experience exactly the way recruiters value them. A strong profile helps you stand out, get noticed, and
                move one step closer to your next opportunity.
              </p>
              <ul>
                <li>Recruiter-ready format</li>
                <li>Highlights your strengths</li>
                <li>Faster callbacks</li>
              </ul>
              <div className={styles.bottomNote}>
                <small>Build your profile</small>
                <strong>Create a professional teaching resume</strong>
              </div>
            </Link>

            <Link to="/contact" className={styles.teacherCard}>
              <div className={styles.icon}>🎓</div>
              <h3>Training Programs</h3>
              <h4>Learning Is a Lifelong Journey. Growth Is the Milestone.</h4>
              <p>
                Live and upcoming programmes across the country, searchable by location. Engaging events covering new
                teaching methods, changing curricula, soft skills and new technologies, helping you connect with the
                wider teaching community.
              </p>
              <ul>
                <li>NEP-aligned methods</li>
                <li>Online &amp; in person</li>
                <li>Connect with peers</li>
              </ul>
              <div className={styles.bottomNote}>
                <small>Keep growing</small>
                <strong>Explore upcoming teacher programmes</strong>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- For schools ---------- */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <span>For Schools &amp; Institutions</span>
            <h2>Hire Best Educators With Confidence</h2>
            <p>
              From posting a role to verifying a candidate, the steps that help you bring the right educator into your
              classrooms.
            </p>
          </div>

          <div className={styles.schoolGrid}>
            {SCHOOL_CARDS.map((c) => (
              <div key={c.title} className={styles.schoolCard}>
                <div className={`${styles.icon} ${styles.iconNavy}`}>{c.icon}</div>
                <small>{c.small}</small>
                <h3>{c.title}</h3>
                <h4>{c.heading}</h4>
                <p>{c.text}</p>
                <ul>
                  {c.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <div className={styles.miniBox}>{c.note}</div>
                <Link to={c.ctaKey ? links[c.ctaKey] : c.to} className={styles.schoolBtn}>
                  {c.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBox}>
          <h2>Ready to Find the Right Fit?</h2>
          <p>
            Register as a teacher to showcase your profile or post a vacancy to connect with qualified educators.
            SkoolJobs helps schools and teachers come together on one trusted platform.
          </p>
          <div className={styles.ctaButtons}>
            <Link to={links.registerTeacher} className={styles.btnPrimary}>
              Register as a Teacher
            </Link>
            <Link to={links.postVacancy} className={styles.btnSecondary}>
              Post a Vacancy
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
