import { useEffect, useRef, useState } from "react";
import { Bell, Building2, LogOut, Settings, UserRound } from "lucide-react";
import styles from "./styles/topbar.module.css";
import { DocumentImage } from "./DocumentImage";

const AVATAR_FALLBACK = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-light)",
  color: "var(--color-primary)",
};

/**
 * Dashboard header: welcome line, title, notifications, Settings and the user menu (profile,
 * settings, logout). The welcome line shows the person's name (from the login token, else
 * `fallbackName`, e.g. the school's name), never the email address.
 */
const Topbar = ({
  title = "Teacher Dashboard",
  subtitle = "Find your next teaching opportunity today.",
  unreadCount = 0,
  onNotificationClick,
  notificationDropdown,
  fallbackName = "",
  onSettingsClick,
  onProfileClick,
  profileLabel = "Profile",
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the user menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  let currentUser;
  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    currentUser = {};
  }

  const looksLikeEmail = (value) => typeof value === "string" && value.includes("@");
  const personName =
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    (!looksLikeEmail(currentUser.name) ? currentUser.name : "");
  const displayName = personName || fallbackName || "there";
  const profilePhoto = currentUser.profilePhoto || "";

  const choose = (action) => {
    setMenuOpen(false);
    action?.();
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.headerRow}>
        <div className={styles.welcomeBlock}>
          <p className={styles.welcomeText}>Welcome back, {displayName}</p>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.actionsRow}>
          <div className={styles.notificationWrapper}>
            <button className={styles.iconButton} type="button" onClick={onNotificationClick} aria-label="Notifications">
              <Bell size={18} />
              {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
            </button>
            {notificationDropdown}
          </div>
          {onSettingsClick && (
            <button className={styles.iconButton} type="button" onClick={onSettingsClick} aria-label="Settings">
              <Settings size={18} />
            </button>
          )}
          <div className={styles.userMenuWrapper} ref={menuRef}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              {profilePhoto ? (
                <DocumentImage src={profilePhoto} alt="" className={styles.profilePhoto} />
              ) : (
                <span className={styles.profilePhoto} aria-hidden="true" style={AVATAR_FALLBACK}>
                  <UserRound size={18} />
                </span>
              )}
            </button>
            {menuOpen && (
              <div className={styles.userMenu} role="menu">
                <p className={styles.userMenuName}>{displayName}</p>
                {currentUser.email && <p className={styles.userMenuMeta}>{currentUser.email}</p>}
                {onProfileClick && (
                  <button type="button" role="menuitem" className={styles.userMenuItem} onClick={() => choose(onProfileClick)}>
                    <Building2 size={16} /> {profileLabel}
                  </button>
                )}
                {onSettingsClick && (
                  <button type="button" role="menuitem" className={styles.userMenuItem} onClick={() => choose(onSettingsClick)}>
                    <Settings size={16} /> Settings
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.userMenuItem} ${styles.userMenuLogout}`}
                    onClick={() => choose(onLogout)}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
