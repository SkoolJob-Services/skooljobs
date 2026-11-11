import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageBanner from "../components/PageBanner";
import { useSiteLinks } from "../hooks/useSiteLinks";
import { unsplash } from "../siteConfig";
import styles from "./AboutPage.module.css";

const SLIDES = [
  {
    photo: "1577896851231-70ef18881754",
    tag: "For Teachers",
    title: "Find the right teaching role in the city you choose.",
    text: "Discover opportunities that match your subject, experience, preferred location and career goals.",
  },
  {
    photo: "1523240795612-9a054b0db644",
    tag: "For Schools",
    title: "Hire skilled and pre-screened educators with confidence.",
    text: "Connect with teaching professionals who match your school's academic needs, values and requirements.",
  },
  {
    photo: "1498243691581-b145c3f54a5a",
    tag: "Relocating?",
    title: "Hear about teaching opportunities before you arrive.",
    text: "Explore suitable vacancies in your destination city and plan your career move with greater confidence.",
  },
];

const OFFERS = [
  {
    group: "For Teachers",
    items: [
      { icon: "🔍", title: "Job Search", text: "Browse live teaching roles across India, filtered by city, subject and grade level.", to: "/jobs" },
      { icon: "📄", title: "Resume Builder", text: "Create a school-ready teaching profile in minutes, formatted the way schools want to read it.", to: "/resume-builder" },
      { icon: "🎓", title: "Training Programs", text: "Grow your craft through teaching methodology, classroom management and evaluation techniques.", to: "/services" },
    ],
  },
  {
    group: "For Schools & Institutions",
    items: [
      { icon: "＋", title: "Post a Job", text: "List your vacancy and reach pre-screened teaching professionals across India.", to: "/jd-builder", tag: "Built-in JD Builder" },
      { icon: "✓", title: "Background Check (BGC)", text: "Verify candidate credentials and employment history before making hiring decisions.", to: "/contact" },
      { icon: "☰", title: "Ad-hoc & Contractual", text: "Hire substitute and contract teachers quickly whenever additional support is required.", to: "/contact" },
    ],
  },
];

const IMPACT = [
  { value: "1,200+", label: "Schools Onboarded" },
  { value: "45,000+", label: "Teachers on the Platform" },
  { value: "8,500+", label: "Jobs Posted" },
  { value: "12,000+", label: "Active Job Seekers" },
];

const GALLERY_ROW_1 = [
  ["1577896851231-70ef18881754", "Welcome Aboard", "Your journey begins here. We're excited to have you.", "blue"],
  ["1509062522246-3755977927d7", "Training Day", "Learn, grow and prepare for great opportunities.", "green"],
  ["1516321318423-f06f85e504b3", "Application Sent", "Your application has been submitted successfully.", "red"],
  ["1551836022-d5d88e9218df", "Onboarding", "Getting everything ready for your new journey.", "purple"],
  ["1494526585095-c41746248156", "New City", "Discover new classrooms and new beginnings.", "orange"],
  ["1586281380349-632531db7ed4", "Resume Ready", "Create a profile that stands out to recruiters.", "teal"],
];
const GALLERY_ROW_2 = [
  ["1522202176988-66273c2fd55f", "First Day", "A fresh beginning with endless possibilities.", "yellow"],
  ["1556761175-b413da4baf72", "Interview", "Showcase your confidence and skills.", "cyan"],
  ["1450101499163-c8848c66ca85", "Job Search", "Explore teaching opportunities across India.", "pink"],
  ["1503676260728-1c00da094a0b", "Classroom", "Inspire students and shape tomorrow.", "green"],
  ["1523580846011-d3a5bc25702b", "Achievement", "Celebrate every milestone together.", "red"],
  ["1517048676732-d65bc937f952", "Community", "Building lifelong educational connections.", "orange"],
];

const BELIEFS = [
  ["People Shape Education", "Great schools begin with great people."],
  ["Trust Matters", "Every opportunity and connection must be built on absolute credibility."],
  ["Growth Never Stops", "Learning and professional development are lifelong journeys."],
  ["Together, We Grow", "When schools and educators succeed together, education moves forward."],
];

function GalleryRow({ items, direction }) {
  return (
    <div className={`${styles.galleryRow} ${direction === "right" ? styles.rowRight : styles.rowLeft}`}>
      {[...items, ...items].map(([photo, title, text, color], i) => (
        <div key={i} className={`${styles.galleryCard} ${styles[color]}`} aria-hidden={i >= items.length}>
          <div className={styles.galleryImg} style={{ backgroundImage: `url(${unsplash(photo, 800)})` }} />
          <div className={styles.galleryContent}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const links = useSiteLinks();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [active]);

  const go = (step) => setActive((i) => (i + step + SLIDES.length) % SLIDES.length);

  return (
    <>
      <PageBanner tag="About Us" title="About Skooljobs">
        SkoolJobs brings teaching opportunities from across India into one trusted platform where teachers find the
        right classrooms and schools discover qualified educators to build stronger learning communities.
      </PageBanner>

      {/* ---------- Who we are ---------- */}
      <section className={styles.design}>
        <div className={styles.designWrap}>
          <div className={styles.aboutText}>
            <div className={styles.label}>
              <span /> Who We Are <span />
            </div>
            <h2>About Skooljobs</h2>
            <p>
              At <strong>Skooljobs, we believe teaching is a passion and it should stay one.</strong> We bring teaching
              jobs from across India into one place, so schools find the right talent and teachers find the right
              classroom, in the city they want to be in.
            </p>
            <p>
              <strong>Register once, and nothing suitable slips by you.</strong> Moving to a new city? We will flag
              openings before you even arrive. Through our training programmes, we help teachers continue growing in
              the profession they love.
            </p>
            <p>Schools run on passionate teachers. We&apos;re here to connect them.</p>
          </div>

          <div className={styles.slider} aria-roledescription="carousel">
            {SLIDES.map((s, i) => (
              <div
                key={s.photo}
                className={`${styles.slide} ${i === active ? styles.slideActive : ""}`}
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(21,41,63,.05), rgba(21,41,63,.18) 55%, rgba(21,41,63,.72)), url(${unsplash(s.photo, 1600)})`,
                }}
                aria-hidden={i !== active}
              >
                <div className={styles.popup}>
                  <span>{s.tag}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
            <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Previous slide" onClick={() => go(-1)}>
              ❮
            </button>
            <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Next slide" onClick={() => go(1)}>
              ❯
            </button>
            <div className={styles.dots}>
              {SLIDES.map((s, i) => (
                <button
                  key={s.photo}
                  type="button"
                  className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === active}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Belief ---------- */}
      <section className={styles.belief}>
        <div className={styles.beliefWrap}>
          <div className={styles.quoteMark}>“</div>
          <h2>
            Schools are the temples of the <br />
            modern world — run not by priests, <br />
            but by <span>passionate teachers.</span>
          </h2>
          <div className={styles.line} />
          <p>THE SKOOLJOBS BELIEF</p>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className={styles.offer}>
        <div className={styles.offerWrap}>
          <div className={styles.offerHead}>
            <span>What We Offer</span>
            <h2>Our Services</h2>
          </div>
          {OFFERS.map((group) => (
            <div key={group.group} className={styles.offerSection}>
              <h4>{group.group}</h4>
              <div className={styles.offerGrid}>
                {group.items.map((item) => (
                  <Link key={item.title} to={item.to} className={styles.offerCard}>
                    <div className={styles.offerIcon}>{item.icon}</div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    {item.tag && <span className={styles.offerTag}>{item.tag}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Impact ---------- */}
      <section className={styles.impact}>
        <div className={styles.impactWrap}>
          <h2>Our Impact So Far</h2>
          <div className={styles.impactGrid}>
            {IMPACT.map((i) => (
              <div key={i.label} className={styles.impactCard}>
                <div className={styles.impactNumber}>{i.value}</div>
                <div className={styles.impactText}>{i.label}</div>
                <div className={styles.impactLine} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Gallery ---------- */}
      <section className={styles.gallery}>
        <div className={styles.galleryHead}>
          <span>Moments on the Platform</span>
          <h2>Our Gallery</h2>
        </div>
        <GalleryRow items={GALLERY_ROW_1} direction="left" />
        <GalleryRow items={GALLERY_ROW_2} direction="right" />
      </section>

      {/* ---------- Vision, mission, beliefs ---------- */}
      <section className={styles.values}>
        <div className={styles.valuesWrap}>
          <h2 className={styles.valuesTitle}>Vision, Mission &amp; Beliefs</h2>
          <div className={styles.valueCard}>
            <h3>Our Vision</h3>
            <p>
              To support the Bhartiya Education Ecosystem by bridging talent gaps and ensuring the right fitment for
              every role. We shape the future of education by creating meaningful connections between exceptional
              schools and exceptional people.
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3>Our Mission</h3>
            <p>
              To bring recruitment, career opportunities, professional development, and trusted hiring solutions
              together on one dedicated platform built exclusively for the education sector, making hiring simpler for
              schools and career growth easier for educators.
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3>What We Believe</h3>
            <div className={styles.beliefGrid}>
              {BELIEFS.map(([title, text]) => (
                <div key={title} className={styles.beliefItem}>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Statement ---------- */}
      <section className={styles.statement}>
        <div className={styles.statementWrap}>
          <div className={styles.statementLine} />
          <p>
            <strong>We believe education flourishes when the right people come together.</strong>
            <br />
            <br />
            Every teacher carries the responsibility of shaping future generations, and every school carries the
            responsibility of nurturing that talent. At <strong>SkoolJobs</strong>, our role is simple to bring these two
            together with honesty, care, and a deep respect for the profession of teaching.
          </p>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className={styles.ctaOutbox}>
        <div className={styles.ctaWrap}>
          <div className={styles.ctaContent}>
            <h2>Teaching deserves better connections.</h2>
            <p>
              Register today and let the right opportunity find you or post a vacancy and meet educators who belong in
              your classrooms.
            </p>
            <div className={styles.ctaButtons}>
              <Link to={links.registerTeacher} className={`${styles.ctaBtn} ${styles.teacherBtn}`}>
                Register as a Teacher
              </Link>
              <Link to={links.postVacancy} className={`${styles.ctaBtn} ${styles.jobBtn}`}>
                Post a Vacancy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
