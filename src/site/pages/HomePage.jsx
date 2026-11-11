import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Handshake, Search, Trophy, UserPlus } from "lucide-react";
import JobSearchForm from "../components/JobSearchForm";
import PublicJobCard from "../components/PublicJobCard";
import { usePublicJobs } from "../hooks/usePublicJobs";
import { useSiteLinks } from "../hooks/useSiteLinks";
import { SITE_IMAGES, SITE_TAGLINE, unsplash } from "../siteConfig";
import styles from "./HomePage.module.css";

const HERO_SLIDES = ["1522202176988-66273c2fd55f", "1513258496099-48168024aec0", "1509062522246-3755977927d7"];

const STATS = [
  { value: "25,000+", label: "Teachers Registered" },
  { value: "5,000+", label: "Active Jobs" },
  { value: "500+", label: "Partner Schools" },
];

const STEPS = [
  { icon: UserPlus, title: "1. Create Account", text: "Sign up as a teacher or school, free." },
  { icon: Search, title: "2. Search or Post", text: "Search jobs or post vacancies in minutes." },
  { icon: Handshake, title: "3. Connect", text: "Apply for jobs or shortlist the right candidates." },
  { icon: Trophy, title: "4. Get Hired", text: "Teachers get hired, schools build great teams." },
];

const TESTIMONIALS = [
  {
    quote:
      "I moved cities and had interview calls before I'd even unpacked. SkoolJobs recommended schools that perfectly matched my subject and experience.",
    rating: "5.0",
    initials: "AV",
    name: "Anjali Verma",
    role: "PGT Physics • Noida",
  },
  {
    quote:
      "We filled two urgent vacancies in less than a week. The JD Builder dramatically improved the quality of applications.",
    rating: "5.0",
    initials: "RN",
    name: "Rakesh Nair",
    role: "Principal • Delhi",
  },
  {
    quote:
      "The professional development programme completely refreshed my classroom approach and connected me with teachers nationwide.",
    rating: "4.9",
    initials: "SI",
    name: "Sneha Iyer",
    role: "TGT English • Pune",
  },
];

const VIDEO_ID = "ZYa_g8xBYfk";

export default function HomePage() {
  const links = useSiteLinks();
  const { jobs, loading, error } = usePublicJobs();
  const trackRef = useRef(null);
  const featured = jobs.slice(0, 6);

  const scrollJobs = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 24 : 400;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        <div className={styles.heroSlider} aria-hidden="true">
          {HERO_SLIDES.map((id) => (
            <div key={id} className={styles.heroSlide} style={{ backgroundImage: `url(${unsplash(id, 1600)})` }} />
          ))}
        </div>
        <div className={styles.heroContent}>
          <h1>
            Exceptional educators deserve <span>exceptional schools</span>
          </h1>
          <p>
            One platform for jobs, learning and hiring.
            <br />
            Built for the <span>Bharatiya Education Ecosystem.</span>
          </p>
          <JobSearchForm />
          <div className={styles.heroStats}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statBox}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- What SkoolJobs does ---------- */}
      <section className={styles.does}>
        <div className={styles.doesContainer}>
          <h2 className={styles.doesHeading}>Discover Opportunities. Build Skills. Hire Talent.</h2>
          <div className={styles.doesGrid}>
            <div className={styles.doesCard}>
              <div className={`${styles.doesIcon} ${styles.iconGreen}`}>⌕</div>
              <h3>Opportunities</h3>
              <p>
                Thousands of verified teaching roles across India. Jobs that are screened and matched to your subject,
                city and experience. Your next classroom awaits.
              </p>
              <Link to={links.findJobs} className={styles.doesBtn}>
                Explore Jobs →
              </Link>
            </div>
            <div className={styles.doesCard}>
              <div className={`${styles.doesIcon} ${styles.iconRed}`}>✎</div>
              <h3>Training Programmes</h3>
              <p>
                Live and upcoming programmes across India that can help you upskill on new methods, sharpen soft
                skills, and grow with the teaching community.
              </p>
              <Link to="/services" className={styles.doesBtn}>
                View Programmes →
              </Link>
            </div>
            <div className={styles.doesCard}>
              <div className={`${styles.doesIcon} ${styles.iconNavy}`}>✓</div>
              <h3>Hire Talent</h3>
              <p>
                Post a vacancy and reach pre-screened, verified teachers fast. Our JD Builder and talent pool bring you
                better-qualified applicants sooner.
              </p>
              <Link to="/jd-builder" className={styles.doesBtn}>
                Post a Vacancy →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className={styles.journey}>
        <div className={styles.journeyWrap}>
          <div className={styles.journeyHead}>
            <div className={styles.miniTitle}>
              <span />
              THE JOURNEY
              <span />
            </div>
            <h2>How SkoolJobs Works</h2>
            <p>Simple steps to achieve your goals whether you teach or you hire.</p>
          </div>
          <div className={styles.journeyRow}>
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className={styles.stepGroup}>
                <div className={styles.step}>
                  <div className={`${styles.stepIcon} ${styles[`step${i + 1}`]}`}>
                    <Icon size={42} strokeWidth={1.8} />
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={styles.stepArrow} aria-hidden="true">
                    <ArrowRight size={34} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Featured jobs (live from the Job Posting service) ---------- */}
      <section className={styles.featured}>
        <div className={styles.fjContainer}>
          <div className={styles.fjHeader}>
            <div className={styles.fjHeading}>
              <span className={styles.eyebrow}>Now Hiring</span>
              <h2>Featured Teaching Jobs</h2>
              <p>
                Explore verified opportunities from schools across India and find the role that matches your subject,
                experience and preferred city.
              </p>
            </div>
            {featured.length > 1 && (
              <div className={styles.fjNav}>
                <button type="button" className={styles.fjArrow} aria-label="Previous jobs" onClick={() => scrollJobs(-1)}>
                  ❮
                </button>
                <button type="button" className={styles.fjArrow} aria-label="Next jobs" onClick={() => scrollJobs(1)}>
                  ❯
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className={styles.fjTrack} aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${styles.fjSlide} ${styles.skeleton}`} />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className={styles.fjTrack} ref={trackRef}>
              {featured.map((job, i) => (
                <div key={job.id} className={styles.fjSlide}>
                  <PublicJobCard job={job} index={i} to={links.jobDetail(job.id)} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.fjEmpty}>
              <p>
                {error
                  ? "Live job listings couldn't be loaded right now."
                  : "New teaching jobs are being added. Check back soon."}
              </p>
              <Link to={links.isAuthenticated ? links.findJobs : "/signup"} className={styles.doesBtn}>
                {links.isAuthenticated ? "Browse Jobs" : "Sign up to get job alerts"} →
              </Link>
            </div>
          )}

          {featured.length > 0 && (
            <div className={styles.fjMore}>
              <Link to="/jobs" className={styles.fjMoreLink}>
                View all jobs →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Video ---------- */}
      <section className={styles.video}>
        <div className={styles.videoWrap}>
          <div className={styles.videoContent}>
            <h2>Where Education Careers and Schools Grow Together</h2>
            <p>
              Behind every successful school is a dedicated team of educators. Behind every inspiring educator is an
              opportunity to grow.
            </p>
            <p>
              SkoolJobs brings these together on one trusted platform by helping schools find the right talent while
              enabling educators to build meaningful careers, continue learning, and make a lasting difference in
              classrooms across India.
            </p>
            <a
              href="https://www.youtube.com/watch?v=Ku4dG1iDFyU"
              className={styles.watchBtn}
              target="_blank"
              rel="noreferrer"
            >
              Watch Video
            </a>
          </div>
          <div className={styles.videoBox}>
            <iframe
              src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&rel=0`}
              title="SkoolJobs Video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ---------- Partner schools ---------- */}
      <section className={styles.partners}>
        <h2>Trusted by Leading Schools That Value Excellence</h2>
        <div className={styles.marquee}>
          <div className={styles.logoTrack}>
            {[...SITE_IMAGES.partnerLogos, ...SITE_IMAGES.partnerLogos].map((src, i) => (
              <img key={`${src}-${i}`} src={src} alt={i < SITE_IMAGES.partnerLogos.length ? "Partner school" : ""} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className={styles.testimonials}>
        <div className={styles.tHeading}>
          <span>TESTIMONIALS</span>
          <h2>Success Stories</h2>
          <p>Trusted by Educators. Valued by Schools.</p>
        </div>
        <div className={styles.tSlider}>
          <div className={styles.tTrack}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <figure key={i} className={styles.tCard} aria-hidden={i >= TESTIMONIALS.length}>
                <div className={styles.tQuote}>❝</div>
                <div className={styles.tRating}>
                  ★★★★★ <span>{t.rating}</span>
                </div>
                <blockquote>{t.quote}</blockquote>
                <figcaption className={styles.tUser}>
                  <div className={styles.tAvatar}>{t.initials}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className={styles.cta}>
        <div className={styles.ctaContainer}>
          <h2>
            The Right People. The Right Opportunities.
            <br />
            One Education Platform.
          </h2>
          <p>{SITE_TAGLINE}</p>
          <div className={styles.ctaButtons}>
            <Link to={links.findJobs} className={styles.btnPrimary}>
              Find Jobs
            </Link>
            <Link to={links.postVacancy} className={styles.btnOutline}>
              Post a Vacancy
            </Link>
          </div>
          <p className={styles.ctaNote}>
            Every student deserves a great teacher. Every great teacher deserves the right school. We&apos;re here to
            bring them together
          </p>
        </div>
      </section>
    </>
  );
}
