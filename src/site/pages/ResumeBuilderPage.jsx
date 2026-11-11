import { Link } from "react-router-dom";
import { Briefcase, FileDown, FileText, GraduationCap, MousePointerClick, ShieldCheck, Sparkles, Target } from "lucide-react";
import Faq from "../components/Faq";
import { useSiteLinks } from "../hooks/useSiteLinks";
import { SITE_IMAGES } from "../siteConfig";
import styles from "./ResumeBuilderPage.module.css";

const FEATURES = [
  { icon: GraduationCap, title: "Education-specific sections", text: "Subjects, grades, teaching philosophy, extracurriculars" },
  { icon: Sparkles, title: "AI summary generator", text: "Enter your role — AI writes your professional summary" },
  { icon: ShieldCheck, title: "ATS-friendly format", text: "Passes school HR software without formatting errors" },
  { icon: FileDown, title: "Free PDF download", text: "No account needed — one click, ready to send" },
];

const HOW = [
  {
    icon: Briefcase,
    title: "Find Your Dream Job",
    lead: "Explore Thousands of Opportunities",
    text: "Search and apply for the latest teaching and professional jobs from top schools, colleges, and organizations across India.",
  },
  {
    icon: FileText,
    title: "Easy Resume Builder",
    lead: "Create Professional Resumes",
    text: "Build ATS-friendly resumes in minutes using modern templates designed to help you stand out to recruiters.",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    lead: "Jobs Recommended for You",
    text: "Get personalized job recommendations based on your skills, experience, qualifications, and career interests.",
  },
  {
    icon: MousePointerClick,
    title: "Quick Apply System",
    lead: "Apply with One Click",
    text: "Save time with an easy application process and connect directly with recruiters and institutions instantly.",
  },
];

const FAQ = [
  {
    q: "Do you recruit teachers for all subjects?",
    a: "Yes, we cover a broad spectrum including core subjects like Math and Science, languages, humanities, and extracurricular disciplines.",
  },
  {
    q: "How can I apply for a job?",
    a: "Browse our “Find A Job” section, select a suitable vacancy, and follow the application instructions. Our consultants will assist you through the process.",
  },
  {
    q: "Can schools post jobs directly?",
    a: "Currently, SkoolJobs manages recruitment directly with schools to ensure quality and vetting. Contact us to discuss your hiring needs.",
  },
];

export default function ResumeBuilderPage() {
  const links = useSiteLinks();

  return (
    <>
      <section className={styles.hero}>
        <div className={`${styles.floating} ${styles.float1}`} aria-hidden="true" />
        <div className={`${styles.floating} ${styles.float2}`} aria-hidden="true" />
        <div className={styles.heroWrap}>
          <div className={styles.heroLeft}>
            <h1>Create Your Professional Resume Easily</h1>
            <p>
              Design modern, ATS-friendly resumes with our advanced Resume Builder. Add your education, experience,
              skills, certifications, and create a job-winning resume within minutes.
            </p>
            <div className={styles.heroButtons}>
              <Link to={links.resumeBuilder} className={styles.btnPrimary}>
                Build Resume
              </Link>
              <a href="#templates" className={styles.btnSecondary}>
                View Templates
              </a>
            </div>
          </div>
          <div className={styles.heroRight} aria-hidden="true">
            <div className={styles.resumeCard}>
              <div className={styles.resumeTop}>
                <div className={styles.avatar} />
                <div>
                  <h3>Rahul Sharma</h3>
                  <span>Private Teacher</span>
                </div>
              </div>
              {[90, 70, 85, 60, 75].map((w) => (
                <div key={w} className={styles.line}>
                  <span style={{ width: `${w}%` }} />
                </div>
              ))}
              <div className={styles.skills}>
                {["Mathematic", "English", "Hindi", "Computer", "Chemistry"].map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="templates" className={styles.templates}>
        <h2 className={styles.sectionTitle}>Template Gallery</h2>
        <div className={styles.templateGrid}>
          {SITE_IMAGES.resumeTemplates.map((t, i) => (
            <a key={t.full} href={t.full} target="_blank" rel="noreferrer" className={styles.template}>
              <img src={t.thumb} alt={`Resume template ${i + 1}`} loading="lazy" width="212" height="300" />
            </a>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Built for teachers, not generic job seekers</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className={styles.feature}>
              <div className={styles.featureIcon}>
                <Icon size={26} />
              </div>
              <h4>{title}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.how}>
        <h2 className={styles.sectionTitle}>How to Work</h2>
        <div className={styles.howGrid}>
          {HOW.map(({ icon: Icon, title, lead, text }, i) => (
            <div key={title} className={`${styles.howCard} ${i % 2 ? styles.howBlue : ""}`}>
              <div className={styles.howIcon}>
                <Icon size={28} />
              </div>
              <h4>{title}</h4>
              <strong>{lead}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Faq items={FAQ} />
    </>
  );
}
