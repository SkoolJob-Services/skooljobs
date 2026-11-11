import { Bell, Settings, UserRound } from "lucide-react";

const AVATAR_FALLBACK = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-light)",
  color: "var(--color-primary)",
};
import styles from "./styles/topbar.module.css";

const Topbar = ({
  title = "Teacher Dashboard",
  subtitle = "Find your next teaching opportunity today.",
  unreadCount = 0,
  onNotificationClick,
  notificationDropdown,
}) => {
  let currentUser;

  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    currentUser = {};
  }

  const displayName =
    currentUser.name ||
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    currentUser.email?.split("@")[0] ||
    "Teacher";
  const profilePhoto = currentUser.profilePhoto || "";

  return (
    <div className={styles.topbar}>
      <div className={styles.headerRow}>
        <div className={styles.welcomeBlock}>
          <p className={styles.welcomeText}>
            Welcome back, {displayName}
          </p>
          <h2 className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.actionsRow}>
          <div className={styles.notificationWrapper}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={onNotificationClick}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className={styles.unreadBadge}>
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationDropdown}
          </div>
          <button
            className={styles.iconButton}
            type="button"
          >
            <Settings size={18} />
          </button>
          {profilePhoto ? (
            <img src={profilePhoto} alt="profile" className={styles.profilePhoto} />
          ) : (
            <span className={styles.profilePhoto} aria-hidden="true" style={AVATAR_FALLBACK}>
              <UserRound size={18} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
