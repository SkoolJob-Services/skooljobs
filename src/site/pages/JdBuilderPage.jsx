import { Link } from "react-router-dom";
import Faq from "../components/Faq";
import { useSiteLinks } from "../hooks/useSiteLinks";
import { SITE_IMAGES } from "../siteConfig";
import styles from "./JdBuilderPage.module.css";

const STEPS = [
  { icon: "👤", step: "Step 1", title: "Create School Account", text: "Register your school or organization with basic details to start hiring teachers quickly." },
  { icon: "📄", step: "Step 2", title: "Choose Job Template", text: "Select from professional teaching job templates designed for schools and institutes." },
  { icon: "📢", step: "Step 3", title: "Publish Teaching Vacancy", text: "Post your vacancy instantly and reach thousands of active teaching professionals." },
  { icon: "✅", step: "Step 4", title: "Receive Applications", text: "Review applications, shortlist candidates, and hire the right teacher faster." },
];

const FAQ = [
  {
    q: "How can schools create a teaching job post?",
    a: "Schools can register on the platform, log in to their dashboard, and click on “Post a Job.” They can then fill in details like subject, experience, salary, location, and hiring requirements before publishing the vacancy.",
  },
  {
    q: "Is registration free for schools?",
    a: "Yes, schools can create an account and explore the platform for free. Additional premium hiring features may also be available for faster recruitment.",
  },
  {
    q: "Can schools shortlist teachers directly?",
    a: "Yes, schools can review teacher profiles, resumes, qualifications, and experience before shortlisting candidates for interviews.",
  },
];

export default function JdBuilderPage() {
  const links = useSiteLinks();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.glowBottom} aria-hidden="true" />
        <div className={styles.heroWrap}>
          <div className={styles.heroLeft}>
            <div className={styles.pill}>✨ Smart &amp; Modern Job Description Builder</div>
            <h1>
              Build Stunning <br />
              Job Descriptions <br />
              In Minutes
            </h1>
            <p>
              Create professional and attractive job descriptions for schools, companies, and recruiters with JD Builder
              designed to save time and hire faster.
            </p>
            <Link to={links.postVacancy} className={styles.startBtn}>
              Start Building
            </Link>
          </div>

          <div className={styles.heroRight} aria-hidden="true">
            <div className={styles.glassCard}>
              <div className={styles.dots}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.jdCard}>
                <div className={styles.jdTop}>
                  <h3>Physics Teacher</h3>
                  <span>Full Time</span>
                </div>
                <p>
                  Looking for an experienced Physics Teacher with strong classroom management and communication skills.
                </p>
                <div className={styles.jdTags}>
                  <span>₹40K Salary</span>
                  <span>2+ Years</span>
                  <span>B.Ed Required</span>
                </div>
              </div>
              <div className={styles.miniCards}>
                <div>
                  <div className={styles.miniIcon}>⚡</div>
                  <h4>Fast Creation</h4>
                </div>
                <div>
                  <div className={styles.miniIcon}>🎯</div>
                  <h4>Smart Templates</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.how}>
        <div className={styles.howContainer}>
          <div className={styles.howHeading}>
            <h2>How It Works</h2>
            <p>Easily create teaching job posts and connect with qualified candidates in just a few steps.</p>
          </div>
          <div className={styles.howGrid}>
            {STEPS.map((s, i) => (
              <div key={s.step} className={`${styles.howCard} ${i % 2 ? styles.blueCard : styles.whiteCard}`}>
                <div className={styles.iconBox}>{s.icon}</div>
                <h3>{s.step}</h3>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Faq items={FAQ} aside={<img src={SITE_IMAGES.jdFaq} alt="Teachers at work" loading="lazy" />} />
    </>
  );
}
