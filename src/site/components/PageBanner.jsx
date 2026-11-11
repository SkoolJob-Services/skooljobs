import styles from "./PageBanner.module.css";

/**
 * Coloured page header used by About, Services, Blog, Contact and Jobs.
 * variant: "solid" (light blue with shapes) | "gradient" (blue gradient) | "dark-circles"
 */
export default function PageBanner({ tag, title, children, variant = "solid", as: Heading = "h1" }) {
  return (
    <section className={`${styles.banner} ${styles[variant] || ""}`}>
      <div className={`${styles.circle} ${styles.circleLeft}`} aria-hidden="true" />
      <div className={`${styles.circle} ${styles.circleRight}`} aria-hidden="true" />
      <div className={`${styles.diamond} ${styles.diamondLeft}`} aria-hidden="true" />
      <div className={`${styles.diamond} ${styles.diamondRight}`} aria-hidden="true" />
      <div className={styles.content}>
        {tag && <span className={styles.tag}>{tag}</span>}
        <Heading className={styles.title}>{title}</Heading>
        {children && <p className={styles.text}>{children}</p>}
      </div>
    </section>
  );
}
