import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, Clipboard } from "lucide-react";
import { withoutDemoInterviews } from "../../lib/schooldata";
import styles from "./styles/TeacherInterviews.module.css";

const TeacherInterviews = () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const teacherProfile = JSON.parse(
    localStorage.getItem("skooljobs_teacher_data") || "{}",
  );
  const candidateName =
    `${teacherProfile.firstName || currentUser.firstName || ""} ${teacherProfile.lastName || currentUser.lastName || ""}`.trim();

  const [interviews] = useState(() => {
    try {
      return withoutDemoInterviews(JSON.parse(localStorage.getItem("skooljobs_interviews") || "[]"));
    } catch {
      return [];
    }
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "upcoming";
  const setActiveTab = (id) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", id);
        return next;
      },
      { replace: true },
    );

  const handleCopyDetails = (iv) => {
    const roleName = iv.role || iv.jobTitle || "Teacher";
    const schoolName = iv.school || "School";
    const meetingLink = iv.link || iv.meetingLink || "";
    const text =
      iv.mode === "Online"
        ? `Interview for ${roleName} at ${schoolName}\nDate: ${iv.date} at ${iv.time}\nMode: Online (Zoom: ${meetingLink})`
        : `Interview for ${roleName} at ${schoolName}\nDate: ${iv.date} at ${iv.time}\nMode: In-Person\nLocation: ${iv.location}`;
    navigator.clipboard.writeText(text);
    alert("Interview invitation details copied to clipboard!");
  };

  const myInterviews = interviews.filter(
    (iv) =>
      String(iv.candidateId) === String(currentUser.id) ||
      (candidateName && iv.candidateName?.toLowerCase() === candidateName.toLowerCase()),
  );

  const upcomingInterviews = myInterviews.filter(
    (iv) => iv.status !== "Completed" && iv.status !== "Cancelled",
  );
  const pastInterviews = myInterviews.filter(
    (iv) => iv.status === "Completed" || iv.status === "Cancelled",
  );

  const activeInterviews =
    activeTab === "upcoming" ? upcomingInterviews : pastInterviews;

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Interviews</h2>
          <p className={styles.subtitle}>
            Track your scheduled interviews and communicate with recruiters.
          </p>
        </div>

        {/* Tab switcher */}
        <div className={styles.tabSwitcher}>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={
              activeTab === "upcoming" ? styles.tabButtonActive : styles.tabButton
            }
          >
            Upcoming ({upcomingInterviews.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={
              activeTab === "past" ? styles.tabButtonActive : styles.tabButton
            }
          >
            Past ({pastInterviews.length})
          </button>
        </div>
      </div>

      {activeInterviews.length === 0 ? (
        <p className={styles.emptyState}>
          No {activeTab} interviews scheduled.
        </p>
      ) : (
        <div className={styles.listWrap}>
          {activeInterviews.map((iv) => (
            <div key={iv.id} className={styles.card}>
              <div className={styles.cardTopRow}>
                <div className={styles.cardTopInfo}>
                  <h3 className={styles.jobTitle}>
                    {iv.role || iv.jobTitle}
                  </h3>
                  <p className={styles.schoolName}>
                    {iv.school || "School"}
                  </p>

                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <Calendar size={14} className={styles.metaIconMuted} />
                      {iv.date}
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={14} className={styles.metaIconMuted} />
                      {iv.time}
                    </span>
                    <span className={styles.metaItem}>
                      {iv.mode === "Online" ? (
                        <>
                          <Video size={14} className={styles.metaIconOnline} />
                          <span className={styles.modeBadgeOnline}>
                            Online
                          </span>
                        </>
                      ) : (
                        <>
                          <MapPin size={14} className={styles.metaIconInPerson} />
                          <span className={styles.modeBadgeInPerson}>
                            In-Person
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className={styles.statusCol}>
                  <span
                    className={`${styles.statusBadge} ${
                      iv.status === "Scheduled"
                        ? styles.statusScheduled
                        : iv.status === "Completed"
                          ? styles.statusCompleted
                          : styles.statusCancelled
                    }`}
                  >
                    {iv.status}
                  </span>
                  <span className={styles.roundLabel}>
                    {iv.round}
                  </span>
                </div>
              </div>

              {(iv.notes || iv.notesForCandidate) && (
                <div className={styles.notesBox}>
                  <p className={styles.notesTitle}>
                    Recruiter Notes:
                  </p>
                  <p>{iv.notes || iv.notesForCandidate}</p>
                  {iv.mode === "Online" && (iv.link || iv.meetingLink) && (
                    <div className={styles.meetingLinkRow}>
                      Meeting Link:{" "}
                      <a
                        href={iv.link || iv.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.meetingLinkAnchor}
                      >
                        {iv.link || iv.meetingLink}
                      </a>
                    </div>
                  )}
                  {iv.mode === "In-Person" && iv.location && (
                    <div className={styles.locationRow}>
                      Location:{" "}
                      <span className={styles.locationValue}>
                        {iv.location}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "upcoming" && (
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(iv)}
                    className={styles.copyButton}
                  >
                    <Clipboard size={14} /> Copy Invite Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TeacherInterviews;
