import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { CONTACT_INFO, FOOTER_COLUMNS, NAV_LINKS, SITE_IMAGES, SITE_TAGLINE, SOCIAL_LINKS, APP_LINKS } from "./siteConfig";
import { useSiteLinks } from "./hooks/useSiteLinks";
import styles from "./SiteLayout.module.css";

/** Header, footer and floating tool buttons shared by every website page. */
export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const links = useSiteLinks();

  // Close the mobile menu when the page changes.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className={styles.site}>
      <a href="#site-main" className={styles.skipLink}>
        Skip to content
      </a>

      <header className={styles.navbar}>
        <div className={styles.navWrap}>
          <Link to="/" className={styles.logo} aria-label="SkoolJobs home">
            <img src={SITE_IMAGES.logo} alt="SkoolJobs Logo" />
          </Link>

          <button
            type="button"
            className={styles.navToggle}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          <nav id="site-menu" className={`${styles.menu} ${menuOpen ? styles.menuOpen : ""}`} aria-label="Main">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.menuLinkActive : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
            <div className={styles.authButtons}>
              {links.isAuthenticated ? (
                <Link to={links.dashboard} className={styles.signupBtn}>
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link to={APP_LINKS.signup} className={styles.signupBtn}>
                    Sign Up
                  </Link>
                  <Link to={APP_LINKS.login} className={styles.loginBtn}>
                    Login
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="site-main" className={styles.main}>
        <Outlet />
      </main>

      <div className={styles.floatingMenu}>
        <Link to="/resume-builder" className={styles.actionCard} title="Build your professional resume">
          <span className={styles.actionIcon} aria-hidden="true">
            📋
          </span>
          <span className={styles.actionText}>
            <strong>Resume</strong>
            <span>Builder</span>
          </span>
        </Link>
        <Link to="/jd-builder" className={styles.actionCard} title="Create job descriptions">
          <span className={styles.actionIcon} aria-hidden="true">
            ✍️
          </span>
          <span className={styles.actionText}>
            <strong>Job Desc</strong>
            <span>Creator</span>
          </span>
        </Link>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <img src={SITE_IMAGES.logo} alt="SkoolJobs" className={styles.footerLogo} />
            <h3>SkoolJobs</h3>
            <p>{SITE_TAGLINE}</p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className={styles.footerCol}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={styles.footerCol}>
            <h3>Contact Info</h3>
            <ul className={styles.contactList}>
              <li>
                <Phone size={18} aria-hidden="true" />
                <div>
                  <strong>Phone</strong>
                  <a href={CONTACT_INFO.phoneHref}>{CONTACT_INFO.phone}</a>
                </div>
              </li>
              <li>
                <Mail size={18} aria-hidden="true" />
                <div>
                  <strong>Email</strong>
                  <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                </div>
              </li>
              <li>
                <MapPin size={18} aria-hidden="true" />
                <div>
                  <strong>Address</strong>
                  <span>{CONTACT_INFO.address}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>©{new Date().getFullYear()}, All Rights Reserved by SkoolJobs</p>
          <div className={styles.social}>
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
                {s.short}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
