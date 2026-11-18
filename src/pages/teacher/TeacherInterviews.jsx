import { useOutletContext, useSearchParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, Clipboard } from "lucide-react";
import styles from "./styles/TeacherInterviews.module.css";

/** InterviewSummary (application service) → the card fields below, with the job's title and school. */
const toInterviewCard = (summary, jobsById) => {
  const iv = summary.interview || {};
  const job = jobsById.get(String(summary.job_id)) || {};
  return {
    id: iv.interview_id || `${summary.application_id}-${iv.scheduled_date}-${iv.scheduled_time}`,
    role: job.role || "Interview",
    school: job.school || "",
    date: iv.scheduled_date || "",
    time: iv.scheduled_time || "",
    mode: iv.mode === "In-Person" ? "In-Person" : iv.mode === "Telephonic" ? "Telephonic" : "Online",
    platform: iv.online_platform || "",
    link: iv.meeting_link || "",
    location: [iv.location, iv.room].filter(Boolean).join(", "),
    round: iv.round || "",
    duration: iv.duration || "",
    interviewer: iv.interviewer || "",
    notes: iv.notes_for_candidate || "",
    status: iv.status || "Scheduled",
  };
};

const TeacherInterviews = () => {
  // Interviews from the application service (POST /applications/interviews/search, loaded by TeacherLayout).
  const { myInterviews = [], appliedJobs = [], allJobs = [], applicationsStatus } = useOutletContext();
  const jobsById = new Map([...allJobs, ...appliedJobs].map((j) => [String(j.id), j]));
  const interviews = myInterviews
    .filter((summary) => summary.interview)
    .map((summary) => toInterviewCard(summary, jobsById))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

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
        ? `Interview for ${roleName} at ${schoolName}\nDate: ${iv.date} at ${iv.time}\nMode: Online${iv.platform ? ` (${iv.platform})` : ""}${meetingLink ? `\nLink: ${meetingLink}` : ""}`
        : `Interview for ${roleName} at ${schoolName}\nDate: ${iv.date} at ${iv.time}\nMode: In-Person\nLocation: ${iv.location}`;
    navigator.clipboard.writeText(text);
    alert("Interview invitation details copied to clipboard!");
  };

  const upcomingInterviews = interviews.filter(
    (iv) => iv.status !== "Completed" && iv.status !== "Cancelled",
  );
  const pastInterviews = interviews.filter(
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
          {applicationsStatus === "loading"
            ? "Loading your interviews…"
            : applicationsStatus === "error"
              ? "Couldn't load your interviews. Please try again later."
              : `No ${activeTab} interviews scheduled.`}
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
                      iv.status === "Scheduled" || iv.status === "Confirmed"
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
