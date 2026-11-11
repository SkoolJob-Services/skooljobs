import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@cloudstrytech/ui-components";
import {
  Bookmark,
  Calendar,
  Send,
  GraduationCap,
  X,
  Bell,
} from "lucide-react";
import { formatRelativeTime } from "../../lib/teacherdata";
import { withoutDemoInterviews } from "../../lib/schooldata";
import styles from "./styles/TeacherHome.module.css";

const TeacherHome = () => {
  const navigate = useNavigate();
  const {
    appliedJobs,
    savedJobs,
    activities,
    displayName,
    recommendedJobs,
    handleApply,
    handleSave,
    currentUser,
    profileCompletion,
    profileStatus,
    refreshTeacherProfile,
    jobsLoading,
  } = useOutletContext();

  // Same interviews and filter as the Interviews page (stored by the school side).
  const upcomingInterviews = useMemo(() => {
    let all;
    try {
      all = JSON.parse(localStorage.getItem("skooljobs_interviews") || "[]");
    } catch {
      all = [];
    }
    return withoutDemoInterviews(all)
      .filter(
        (iv) =>
          String(iv.candidateId) === String(currentUser?.id) ||
          iv.candidateName?.toLowerCase() === displayName.toLowerCase(),
      )
      .filter((iv) => iv.status !== "Completed" && iv.status !== "Cancelled")
      .sort((a, b) => String(`${a.date} ${a.time}`).localeCompare(String(`${b.date} ${b.time}`)));
  }, [currentUser, displayName]);
  const nextInterview = upcomingInterviews[0];

  // "This week" counted from when the dashboard opened (render must not read the clock).
  const [openedAt] = useState(() => Date.now());
  const weekAgo = openedAt - 7 * 24 * 60 * 60 * 1000;
  const sentThisWeek = appliedJobs.filter(
    (job) => job.appliedDate && new Date(job.appliedDate).getTime() >= weekAgo,
  ).length;
  const savedCategories = new Set(savedJobs.map((job) => job.skill).filter(Boolean)).size;

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleMarkRead = (id) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleDeleteNotification = (id) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationDropdown = showNotifDropdown && (
    <div className={styles.notifDropdown}>
      <div className={styles.notifHeader}>
        <p className={styles.notifTitle}>
          Notifications {unreadCount > 0 && <span className={styles.notifUnreadCount}>({unreadCount} new)</span>}
        </p>
        <div className={styles.notifHeaderActions}>
          <button
            type="button"
            onClick={() =>
              setNotifications((p) =>
                p.map((n) => ({ ...n, read: true }))
              )
            }
            className={styles.notifMarkReadButton}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => setShowNotifDropdown(false)}
            className={styles.notifCloseButton}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={styles.notifList}>
        {notifications.length === 0 ? (
          <p className={styles.notifEmpty}>No notifications</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={n.read ? styles.notifItem : styles.notifItemUnread}
            >
              <span className={n.read ? styles.notifDot : styles.notifDotUnread} />
              <div className={styles.notifBody}>
                <p className={styles.notifMsg}>{n.msg}</p>
                <p className={styles.notifTime}>{n.time}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                className={styles.notifDeleteButton}
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* 1. Header Welcome Card */}
      <div className={styles.welcomeCard}>
        <div>
          <p className={styles.welcomeEyebrow}>
            Welcome Back, {displayName.toUpperCase()}
          </p>
          <h2 className={styles.welcomeTitle}>
            Teacher Dashboard
          </h2>
          <p className={styles.welcomeSubtitle}>
            Find your next teaching opportunity today.
          </p>
          {profileStatus === "missing" && (
            <p className={styles.profileStrengthHint}>
              Your teacher profile is still being set up.{" "}
              <button type="button" className={styles.viewAllButton} onClick={refreshTeacherProfile}>
                Check again
              </button>
            </p>
          )}
          {profileStatus === "error" && (
            <p className={styles.profileStrengthHint}>
              Your profile couldn&apos;t be loaded.{" "}
              <button type="button" className={styles.viewAllButton} onClick={refreshTeacherProfile}>
                Try again
              </button>
            </p>
          )}
        </div>

        <div className={styles.welcomeRightCol}>
          {/* Action Icons */}
          <div className={styles.actionIconsRow}>
            <div className={styles.notifButtonWrap}>
              <button
                className={styles.notifBellButton}
                type="button"
                onClick={() => setShowNotifDropdown((v) => !v)}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className={styles.notifBadge}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationDropdown}
            </div>
          </div>

          {/* Profile Strength progress tracker */}
          <div className={styles.profileStrengthWrap}>
            <div className={styles.profileStrengthRow}>
              <span className={styles.profileStrengthPercent}>{profileCompletion}% Complete</span>
              <span className={styles.profileStrengthLabel}>Profile Strength</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${profileCompletion}%` }} />
            </div>
            {profileCompletion < 100 && (
              <button
                type="button"
                className={styles.profileStrengthHint}
                onClick={() => navigate("/teacher/profile")}
              >
                ⚡ Complete your profile to reach 100%
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Recommended (Featured) Jobs */}
      <section className={styles.panel}>
        <div className={styles.panelHeaderRow}>
          <h2 className={styles.panelTitle}>
            Recommended Jobs
          </h2>
          <button
            onClick={() => navigate("/teacher/recommendation")}
            className={styles.viewAllButton}
            type="button"
          >
            View all
          </button>
        </div>

        <div className={styles.jobListWrap}>
          {jobsLoading ? (
            <p className={styles.jobListEmpty}>Loading jobs…</p>
          ) : recommendedJobs.length === 0 ? (
            <p className={styles.jobListEmpty}>
              No recommended jobs found. Update your profile skills to match listings.
            </p>
          ) : (
            recommendedJobs.map((job) => {
              const isApplied = appliedJobs.some((item) => item.id === job.id);
              const isSaved = savedJobs.some((item) => item.id === job.id);

              const handleRowClick = (e) => {
                if (e.target.closest("button")) return;
                navigate(`/teacher/jobs/${job.id}`);
              };

              return (
                <div
                  key={job.id}
                  onClick={handleRowClick}
                  className={styles.jobRow}
                >
                  <div className={styles.jobRowLeft}>
                    {/* School Icon Placeholder */}
                    <div className={styles.jobIconBadge}>
                      <GraduationCap size={22} />
                    </div>
                    <div className={styles.jobRowInfo}>
                      <h3 className={styles.jobRole}>
                        {job.role}
                      </h3>
                      <p className={styles.jobMeta}>
                        {job.school} · {job.location}
                      </p>
                      <div className={styles.jobTagsRow}>
                        <span>{job.type}</span>
                        <span>·</span>
                        <span>{job.skill}</span>
                        <span>·</span>
                        <span className={styles.jobSalary}>
                          {job.salary}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.jobRowRight}>
                    <span className={styles.matchBadge}>
                      {job.match || "95"}% Match
                    </span>
                    <div className={styles.jobActionsRow}>
                      <Button
                        variant="filled"
                        onClick={() => handleApply(job)}
                      >
                        {isApplied ? "Applied" : "Apply"}
                      </Button>

                      <Button
                        variant="outlined"
                        onClick={() => handleSave(job)}
                      >
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Metrics Section (3 cards instead of 4) */}
      <div className={styles.metricsGrid}>
        {/* Card 1: Applications Sent */}
        <button
          type="button"
          onClick={() => navigate("/teacher/applications")}
          className={styles.metricCard}
        >
          <div className={styles.metricHeaderRow}>
            <span className={styles.metricLabel}>
              Applications Sent
            </span>
            <span className={styles.metricIconBadgeGreen}>
              <Send size={18} />
            </span>
          </div>
          <p className={styles.metricValue}>
            {appliedJobs.length}
          </p>
          <p className={styles.metricFootnoteGreen}>
            {sentThisWeek} sent this week
          </p>
        </button>

        {/* Card 2: Interviews */}
        <button
          type="button"
          onClick={() => navigate("/teacher/interviews")}
          className={styles.metricCard}
        >
          <div className={styles.metricHeaderRow}>
            <span className={styles.metricLabel}>
              Interviews Scheduled
            </span>
            <span className={styles.metricIconBadgeBlue}>
              <Calendar size={18} />
            </span>
          </div>
          <p className={styles.metricValue}>
            {String(upcomingInterviews.length).padStart(2, "0")}
          </p>
          <p className={styles.metricFootnoteBlue}>
            {nextInterview ? `Next: ${nextInterview.date}, ${nextInterview.time}` : "None scheduled yet"}
          </p>
        </button>

        {/* Card 3: Saved Jobs */}
        <button
          type="button"
          onClick={() => navigate("/teacher/saved-jobs")}
          className={styles.metricCard}
        >
          <div className={styles.metricHeaderRow}>
            <span className={styles.metricLabel}>
              Saved Jobs
            </span>
            <span className={styles.metricIconBadgeAmber}>
              <Bookmark size={18} />
            </span>
          </div>
          <p className={styles.metricValue}>
            {savedJobs.length}
          </p>
          <p className={styles.metricFootnoteSlate}>
            {savedJobs.length === 0
              ? "Save jobs to compare later"
              : `Across ${savedCategories} ${savedCategories === 1 ? "category" : "categories"}`}
          </p>
        </button>
      </div>

      {/* 4. Two-Column Dashboard Layout (Left: Activity, Right: Upcoming Interview Card) */}
      <div className={styles.dashboardGrid}>
        {/* Left Column: Occupies 2/3 width */}
        <div className={styles.leftColumn}>
          {/* Recent Activity */}
          <section className={styles.panelCompact}>
            <h3 className={styles.panelTitleSm}>
              Recent Activity
            </h3>
            <div className={styles.activityListWrap}>
              {activities.length === 0 && (
                <p className={styles.jobListEmpty}>
                  Your applications, saved jobs and profile updates will show here.
                </p>
              )}
              {activities.slice(0, 4).map((activity, index) => (
                <div
                  key={`${activity.message}-${index}`}
                  className={styles.activityRow}
                >
                  <span className={styles.activityDot} />
                  <div className={styles.activityBody}>
                    <span>{activity.message}</span>
                    <span className={styles.activityTime}>
                      {formatRelativeTime(activity.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Upcoming Interview Card */}
        <div className={styles.rightColumn}>
          {/* Upcoming Interview Card */}
          <section className={styles.panelCompact}>
            <div className={styles.interviewHeaderRow}>
              <h3 className={styles.interviewTitle}>
                Upcoming Interview
              </h3>
              <span className={styles.interviewIconBadge}>
                <Calendar size={18} />
              </span>
            </div>

            <div className={styles.interviewDetailsBox}>
              {nextInterview ? (
                <>
                  <p className={styles.interviewDetailsTitle}>
                    {nextInterview.role || nextInterview.jobTitle || "Interview"}
                    {nextInterview.school ? ` @ ${nextInterview.school}` : ""}
                  </p>
                  <p className={styles.interviewDetailsTime}>
                    {nextInterview.date}, {nextInterview.time}
                  </p>
                </>
              ) : (
                <p className={styles.interviewDetailsTime}>
                  No upcoming interviews. Schools will schedule them here when they shortlist you.
                </p>
              )}
            </div>
            <Button
              variant="filled"
              onClick={() => navigate("/teacher/interviews")}
              endIcon="arrowForwardIcon"
            >
              View Interview Details
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TeacherHome;
