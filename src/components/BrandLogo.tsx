import logoUrl from "../assets/brand/skooljobs-logo.png";
import styles from "./styles/BrandLogo.module.css";

export { logoUrl as SKOOLJOBS_LOGO_URL };

interface BrandLogoProps {
  /** On a dark (primary-blue) background the logo sits on a white badge so the blue stays visible. */
  onDark?: boolean;
  /** Logo height in px (width follows). */
  height?: number;
  className?: string;
}

/** The SkoolJobs – Mentors Pathway logo (src/assets/brand/skooljobs-logo.png). */
export function BrandLogo({ onDark = false, height = 48, className }: BrandLogoProps) {
  const img = (
    <img
      src={logoUrl}
      alt="SkoolJobs – Mentors Pathway"
      className={styles.img}
      style={{ height }}
    />
  );
  if (!onDark) return <span className={[styles.plain, className].filter(Boolean).join(" ")}>{img}</span>;
  return <span className={[styles.badge, className].filter(Boolean).join(" ")}>{img}</span>;
}
