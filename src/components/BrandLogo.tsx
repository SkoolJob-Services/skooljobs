import { Link } from "react-router-dom";
import logoUrl from "../assets/brand/skooljobs-logo.png";
import styles from "./styles/BrandLogo.module.css";

export { logoUrl as SKOOLJOBS_LOGO_URL };

interface BrandLogoProps {
  /** On a dark (primary-blue) background the logo sits on a white badge so the blue stays visible. */
  onDark?: boolean;
  /** Logo height in px (width follows). */
  height?: number;
  className?: string;
  /** Where a click on the logo goes: the website home page by default; null = not a link. */
  to?: string | null;
}

/** The SkoolJobs – Mentors Pathway logo (src/assets/brand/skooljobs-logo.png), linking to the home page. */
export function BrandLogo({ onDark = false, height = 48, className, to = "/" }: BrandLogoProps) {
  const img = (
    <img
      src={logoUrl}
      alt="SkoolJobs – Mentors Pathway"
      className={styles.img}
      style={{ height }}
    />
  );
  const classes = [onDark ? styles.badge : styles.plain, className].filter(Boolean).join(" ");
  if (!to) return <span className={classes}>{img}</span>;
  return (
    <Link to={to} className={`${classes} ${styles.link}`} aria-label="SkoolJobs home">
      {img}
    </Link>
  );
}
