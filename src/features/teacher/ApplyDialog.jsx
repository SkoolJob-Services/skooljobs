import { useRef, useState } from "react";
import { FileText, Plus, Upload } from "lucide-react";
import { Button, Dialog, Input } from "@cloudstrytech/ui-components";
import styles from "./ApplyDialog.module.css";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const messageOf = (error, fallback) => (error instanceof Error && error.message ? error.message : fallback);

/**
 * Apply for a job: the teacher picks which resume goes with the application, or adds one
 * (uploaded here, saved to their profile) without leaving the job.
 *
 * Props:
 *   job                 the job being applied for ({ role, school })
 *   resumes             the teacher's resumes ({ id, title, name, format, source })
 *   initialResumeId     the one picked last time
 *   onAddResume(file, title) → Promise<resume>   uploads it and saves it on the profile
 *   onApply(resume)     → Promise                sends the application (rejects with a message)
 *   onCreateOnProfile() opens the CV builder on the profile instead
 *   onClose()
 */
export function ApplyDialog({ job, resumes, initialResumeId, onAddResume, onApply, onCreateOnProfile, onClose }) {
  const fileRef = useRef(null);
  const [chosenId, setChosenId] = useState(
    () => (resumes.some((r) => String(r.id) === String(initialResumeId)) ? initialResumeId : resumes[0]?.id) ?? null,
  );
  // No resume yet: start on "Add Resume".
  const [adding, setAdding] = useState(resumes.length === 0);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = resumes.find((r) => String(r.id) === String(chosenId)) || null;

  const pickFile = (event) => {
    const picked = event.target.files?.[0] || null;
    event.target.value = "";
    setError("");
    if (!picked) return;
    if (picked.size > MAX_RESUME_BYTES) {
      setError("The file is larger than 10 MB. Choose a smaller one.");
      return;
    }
    setFile(picked);
    setTitle((prev) => prev || picked.name.replace(/\.[^/.]+$/, ""));
  };

  const addResume = async () => {
    if (!file) {
      setError("Choose your resume file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const added = await onAddResume(file, title.trim() || file.name.replace(/\.[^/.]+$/, ""));
      setChosenId(added.id);
      setAdding(false);
      setFile(null);
      setTitle("");
    } catch (err) {
      setError(messageOf(err, "Couldn't upload the resume. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!chosen) {
      setError("Choose a resume to send with your application.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onApply(chosen);
      onClose();
    } catch (err) {
      setError(messageOf(err, "Couldn't send your application. Please try again."));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      size="md"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      headline={`Apply for ${job.role || "this job"}`}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {adding ? (
            <Button variant="filled" onClick={() => void addResume()} loading={busy} disabled={busy || !file}>
              Upload resume
            </Button>
          ) : (
            <Button variant="filled" onClick={() => void apply()} loading={busy} disabled={busy || !chosen}>
              Apply
            </Button>
          )}
        </>
      }
    >
      <div className={styles.body}>
        {job.school && <p className={styles.school}>{job.school}</p>}

        {resumes.length > 0 && (
          <fieldset className={styles.list} disabled={busy || adding}>
            <legend className={styles.legend}>Send this resume</legend>
            {resumes.map((resume) => (
              <label
                key={resume.id}
                className={`${styles.option} ${String(resume.id) === String(chosenId) ? styles.optionChosen : ""}`}
              >
                <input
                  type="radio"
                  name="apply-resume"
                  value={resume.id}
                  checked={String(resume.id) === String(chosenId)}
                  onChange={() => setChosenId(resume.id)}
                />
                <FileText size={18} aria-hidden="true" className={styles.icon} />
                <span className={styles.optionText}>
                  <strong>{resume.title || resume.name || "Resume"}</strong>
                  <span className={styles.meta}>
                    {[resume.format, resume.source && String(resume.source).toLowerCase() === "created" ? "Created" : "Uploaded"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {adding ? (
          <div className={styles.addPanel}>
            <p className={styles.addTitle}>{resumes.length ? "Add another resume" : "Add your resume to apply"}</p>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={pickFile} hidden />
            <Button variant="tonal" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={16} aria-hidden="true" /> {file ? "Choose another file" : "Choose file"}
            </Button>
            {file && <p className={styles.fileName}>{file.name}</p>}
            {file && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Resume title</span>
                <Input value={title} onChange={(value) => setTitle(value)} placeholder="e.g. Maths teacher resume" />
              </label>
            )}
            <p className={styles.hint}>
              PDF, Word or text, up to 10 MB. It's also saved to your profile.{" "}
              <button type="button" className={styles.link} onClick={onCreateOnProfile} disabled={busy}>
                Create one with the CV builder instead
              </button>
            </p>
            {resumes.length > 0 && (
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setAdding(false);
                  setFile(null);
                  setError("");
                }}
                disabled={busy}
              >
                Back to my resumes
              </button>
            )}
          </div>
        ) : (
          <button type="button" className={styles.addButton} onClick={() => setAdding(true)} disabled={busy}>
            <Plus size={16} aria-hidden="true" /> Add Resume
          </button>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
