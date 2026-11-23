import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Bookmark, MessageSquare, Save } from "lucide-react";
import styles from "./styles/SchoolSavedCandidates.module.css";
import { Button } from "@cloudstrytech/ui-components";
import { validateText } from "../../lib/textValidation";

import { PersonAvatar } from "../../components/PersonAvatar";
const SchoolSavedCandidates = () => {
  const navigate = useNavigate();
  const { applicants, handleSaveCandidate } = useOutletContext();

  const [candidateComments, setCandidateComments] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  const savedApplicants = applicants.filter((a) => a.saved);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Saved Candidates</h2>
        <span className={styles.countBadge}>
          {savedApplicants.length} saved
        </span>
      </div>
      <p className={styles.subtitle}>
        Profiles you bookmarked from All Applicants. Add private notes for each candidate.
      </p>

      {savedApplicants.length === 0 ? (
        <div className={styles.emptyState}>
          <Bookmark size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No saved candidates yet.</p>
          <p className={styles.emptySubtitle}>
            Click the bookmark icon on any candidate in All Applicants to save them here.
          </p>
          <Button
            variant="filled"
            onClick={() => navigate("/school/all-applicants")}
          >
            Go to All Applicants
          </Button>
        </div>
      ) : (
        <div className={styles.list}>
          {savedApplicants.map((applicant) => (
            <div key={applicant.id} className={styles.card}>
              <div className={styles.cardInner}>
                <PersonAvatar src={applicant.avatar} name={applicant.name} className={styles.avatar} />
                <div className={styles.body}>
                  <div className={styles.bodyHeader}>
                    <div className={styles.bodyHeaderInfo}>
                      <h3 className={styles.name}>{applicant.name}</h3>
                      <p className={styles.metaLine}>
                        {applicant.jobTitle} · {applicant.subject} · {applicant.experience}
                      </p>
                      <p className={styles.qualification}>{applicant.qualification}</p>
                    </div>
                    <div className={styles.statusActions}>
                      <span className={`${styles.statusChip} ${applicant.status === "Shortlisted"
                        ? styles.statusShortlisted
                        : applicant.status === "Rejected"
                          ? styles.statusRejected
                          : styles.statusDefault
                        }`}>
                        {applicant.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveCandidate(applicant.id)}
                        title="Remove from saved"
                        className={styles.bookmarkButton}
                      >
                        <Bookmark size={14} className={styles.bookmarkIcon} />
                      </button>
                    </div>
                  </div>

                  {/* Notes section */}
                  <div className={styles.notesSection}>
                    {editingComment === applicant.id ? (
                      <div className={styles.notesEditWrap}>
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          className={styles.notesTextarea}
                          placeholder="Add private notes about this candidate..."
                        />
                        <div className={styles.notesActions}>
                          <button
                            type="button"
                            onClick={() => {
                              const { valid, reason } = validateText(commentDraft);
                              if (!valid) {
                                alert(reason);
                                return;
                              }
                              setCandidateComments((prev) => ({ ...prev, [applicant.id]: commentDraft }));
                              setEditingComment(null);
                            }}
                            className={styles.saveNoteButton}
                          >
                            <Save size={12} /> Save Note
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingComment(null)}
                            className={styles.cancelNoteButton}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.notesDisplayWrap}>
                        {candidateComments[applicant.id] ? (
                          <div className={styles.noteBox}>
                            <p className={styles.noteBoxLabel}>Note:</p>
                            {candidateComments[applicant.id]}
                          </div>
                        ) : (
                          <p className={styles.noNotes}>No notes added yet.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCommentDraft(candidateComments[applicant.id] || "");
                            setEditingComment(applicant.id);
                          }}
                          className={styles.addNoteButton}
                        >
                          <MessageSquare size={12} />
                          {candidateComments[applicant.id] ? "Edit Note" : "Add Note"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolSavedCandidates;
