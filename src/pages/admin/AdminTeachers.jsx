import { Fragment, useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Info, Inbox, Search, UserPlus, X } from "lucide-react";
import { Button, Input, Select } from "@cloudstrytech/ui-components";
import {
  activateTeacher,
  createTeacherProfile,
  adminUpdateTeacher,
  deactivateTeacher,
  searchTeachers,
} from "../../services/teacherprofileService";
import { mockApiEnabled } from "../../api";
import { refreshUntil } from "../../lib/profileRefresh";
import { PersonAvatar } from "../../components/PersonAvatar";
import ui from "./styles/AdminUi.module.css";
import styles from "./styles/AdminTeachers.module.css";

/*
 * Admin → Teachers (teacher-profile service):
 *   search  GET  /teachers/search?name&subject&city&qualification&status
 *   view    the search result itself (the whole Teacher)
 *   update  POST /teachers/update  (updated_sections basicInfo + contact; ADMIN may update any teacher)
 *   create  POST /teachers         (the service generates teacher_id)
 * Updates and creates answer 202: the list is searched again a moment later.
 */

const STATUS_OPTIONS = [
  { label: "Any status", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Deactivated", value: "INACTIVE" },
  { label: "Deleted by teacher", value: "DELETED" },
];

/** Status chip text: INACTIVE and DELETED teachers can't log in (their details are kept). */
const STATUS_LABEL = { ACTIVE: "Active", INACTIVE: "Deactivated", DELETED: "Deleted by teacher" };
const TITLE_OPTIONS = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof"].map((t) => ({ label: t, value: t }));

/** Teacher JSON keys are mixed (snake_case with @JsonProperty, camelCase without): read both. */
const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};
const idOf = (t) => pick(t, "teacherId", "teacher_id");
const fullName = (t) =>
  [t.title, t.first_name, t.middle_name, t.last_name].filter(Boolean).join(" ") || "—";
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const EMPTY_FORM = {
  title: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  main_subject: "",
  current_job_title: "",
  nationality: "Indian",
  highest_qualification_1: "",
  highest_qualification_2: "",
  summary: "",
  mobile: "",
  whatsapp: "",
  primary_email: "",
  secondary_email: "",
  pin_code: "",
  city: "",
  state: "",
  full_address: "",
};

/** Teacher → editor fields. */
const toForm = (t) => ({
  ...EMPTY_FORM,
  title: t.title || "",
  first_name: t.first_name || "",
  middle_name: t.middle_name || "",
  last_name: t.last_name || "",
  main_subject: t.main_subject || "",
  current_job_title: t.current_job_title || "",
  nationality: t.nationality || "",
  highest_qualification_1: t.highest_qualification_1 || "",
  highest_qualification_2: t.highest_qualification_2 || "",
  summary: t.summary || "",
  mobile: t.contact?.mobile || "",
  whatsapp: t.contact?.whatsapp || "",
  primary_email: pick(t.contact, "primary_email", "primaryEmail") || "",
  secondary_email: pick(t.contact, "secondary_email", "secondaryEmail") || "",
  pin_code: pick(t.address, "pin_code", "pinCode") || "",
  city: t.address?.city || "",
  state: t.address?.state || "",
  full_address: pick(t.address, "full_address", "fullAddress") || "",
});

const orNull = (v) => (typeof v === "string" ? v.trim() || null : v ?? null);

/** Editor fields → the basicInfo + contact sections of a Teacher. */
const formSections = (form) => ({
  title: orNull(form.title),
  first_name: form.first_name.trim(),
  middle_name: orNull(form.middle_name),
  last_name: form.last_name.trim(),
  main_subject: form.main_subject.trim(),
  current_job_title: orNull(form.current_job_title),
  nationality: orNull(form.nationality),
  highest_qualification_1: orNull(form.highest_qualification_1),
  highest_qualification_2: orNull(form.highest_qualification_2),
  summary: orNull(form.summary),
  contact: {
    mobile: form.mobile.trim(),
    whatsapp: orNull(form.whatsapp),
    primary_email: form.primary_email.trim().toLowerCase(),
    secondary_email: orNull(form.secondary_email),
  },
  address: {
    pin_code: orNull(form.pin_code),
    city: orNull(form.city),
    state: orNull(form.state),
    full_address: orNull(form.full_address),
  },
});

function formProblem(form) {
  if (!form.first_name.trim()) return "First name is required.";
  if (!form.last_name.trim()) return "Last name is required.";
  if (!form.main_subject.trim()) return "Main subject is required.";
  if (!/^\+?\d{10,15}$/.test(form.mobile.replace(/[\s-]/g, ""))) return "Enter a valid mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primary_email.trim())) return "Enter a valid email address.";
  return null;
}

const AdminTeachers = () => {
  // serverJobsStatus "local" = the local admin login: no server token, so no teacher service.
  // Under `npm run dev:mock` the teachers come from the in-browser mock instead.
  const { serverJobsStatus } = useOutletContext();
  const localLogin = serverJobsStatus === "local" && !mockApiEnabled;

  const [filters, setFilters] = useState({ name: "", subject: "", city: "", qualification: "", status: "" });
  const [teachers, setTeachers] = useState([]);
  const [loadState, setLoadState] = useState(localLogin ? "local" : "loading");
  const [expandedId, setExpandedId] = useState(null);
  // Editor: null (closed), { mode: "create" } or { mode: "edit", teacher }.
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [listError, setListError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const runSearch = useCallback(
    (criteria) =>
      searchTeachers(criteria).then(
        ({ data }) => ({ ok: true, list: Array.isArray(data) ? data : [] }),
        (error) => {
          console.error("Teacher search failed:", error);
          return { ok: false, list: [] };
        },
      ),
    [],
  );

  const showResult = useCallback((result) => {
    setTeachers(result.list);
    setLoadState(result.ok ? "ready" : "error");
  }, []);

  /**
   * The service stores a change a moment after its 202: search again (PROFILE_REFRESH: wait
   * before each read, a few reads) until `isStored(row)` holds for the teacher, and only then
   * show the list — an earlier read would put the old row back. Returns whether it showed.
   */
  const showWhenStored = async (teacherId, isStored) => {
    const { result, done } = await refreshUntil(
      () => runSearch(filters),
      (res) => res.ok && res.list.some((t) => idOf(t) === teacherId && isStored(t)),
    );
    if (done) showResult(result);
    return done;
  };

  /** The service's reason for a refused call, in words. */
  const serviceError = (error, what) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    if (!error?.response) return `Couldn't reach the teacher service to ${what}. Check the connection and try again.`;
    if (status === 401) return "Your session has ended. Log in again with an ADMIN account.";
    if (status === 403) return message || `Only an ADMIN can ${what}. Log in with an ADMIN account.`;
    return message ? `Couldn't ${what}: ${message}` : `Couldn't ${what}. Please try again.`;
  };

  // First list: every teacher (no filters).
  useEffect(() => {
    if (localLogin) return undefined;
    let cancelled = false;
    runSearch({}).then((result) => {
      if (!cancelled) showResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [localLogin, runSearch, showResult]);

  const search = (event) => {
    event?.preventDefault();
    if (localLogin) return;
    setLoadState("loading");
    runSearch(filters).then(showResult);
  };

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  };

  const openCreate = () => {
    setEditor({ mode: "create" });
    setForm(EMPTY_FORM);
    setFormError("");
    setNotice("");
  };

  const openEdit = (teacher) => {
    setEditor({ mode: "edit", teacher });
    setForm(toForm(teacher));
    setFormError("");
    setNotice("");
  };

  const save = async (event) => {
    event.preventDefault();
    const problem = formProblem(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    try {
      if (editor.mode === "create") {
        await createTeacherProfile({ ...formSections(form), status: "ACTIVE", is_profile_visible: true });
        setNotice(`Teacher profile for ${form.first_name} ${form.last_name} created.`);
      } else {
        const t = editor.teacher;
        // basicInfo replaces every basic field, so the ones this form doesn't edit are sent as loaded.
        await adminUpdateTeacher({
          teacherId: idOf(t),
          teacher_user_id: pick(t, "teacher_user_id", "teacherUserId") || null,
          updated_sections: ["basicInfo", "contact"],
          dob: t.dob ?? null,
          age: t.age ?? null,
          additional_subjects: t.additional_subjects ?? [],
          classes_taught: t.classes_taught ?? [],
          languages: t.languages ?? [],
          profile_photo_url: t.profile_photo_url ?? null,
          isProfileVisible: pick(t, "isProfileVisible", "is_profile_visible") ?? true,
          ...formSections(form),
        });
        setNotice(`Changes to ${form.first_name} ${form.last_name} saved.`);
      }
      const editedId = editor.mode === "edit" ? idOf(editor.teacher) : null;
      const sections = formSections(form);
      if (editedId) {
        // Show the change at once; the list is read again once the service has stored it.
        setTeachers((list) =>
          list.map((t) =>
            idOf(t) === editedId
              ? { ...t, ...sections, contact: { ...t.contact, ...sections.contact }, address: { ...t.address, ...sections.address } }
              : t,
          ),
        );
      }
      setEditor(null);
      const stored = editedId
        ? await showWhenStored(
            editedId,
            (t) =>
              t.first_name === sections.first_name &&
              t.last_name === sections.last_name &&
              String(pick(t.contact, "primary_email", "primaryEmail") || "").toLowerCase() === sections.contact.primary_email,
          )
        : await refreshUntil(() => runSearch(filters), (res) => res.ok).then(({ result, done }) => {
            if (done) showResult(result);
            return done;
          });
      if (!stored) setNotice("Saved. The teacher service hasn't shown the change yet; search again in a moment.");
    } catch (error) {
      console.error("Teacher save failed:", error);
      setFormError(serviceError(error, "save the teacher profile"));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deactivate (login suspended, profile hidden from schools) or reactivate (login allowed again,
   * also after the teacher deleted their account). The details are kept either way.
   */
  const changeLogin = async (teacher, active) => {
    const id = idOf(teacher);
    const name = fullName(teacher);
    const question = active
      ? `Reactivate ${name}? They can log in again and schools can find their profile.`
      : `Deactivate ${name}? They won't be able to log in and schools won't find their profile. Their details are kept.`;
    if (!window.confirm(question)) return;
    setBusyId(id);
    setListError("");
    setNotice("");
    try {
      await (active ? activateTeacher(id) : deactivateTeacher(id));
      setTeachers((list) =>
        list.map((t) => (idOf(t) === id ? { ...t, status: active ? "ACTIVE" : "INACTIVE" } : t)),
      );
      setNotice(active ? `${name} is reactivated and can log in again.` : `${name} is deactivated and can't log in.`);
      const target = active ? "ACTIVE" : "INACTIVE";
      const stored = await showWhenStored(id, (t) => t.status === target);
      if (!stored) {
        setNotice(
          `${active ? "Reactivation" : "Deactivation"} of ${name} was accepted, but the teacher service hasn't shown it yet. Search again in a moment; if it still shows the old status, the change failed on the server.`,
        );
      }
    } catch (error) {
      console.error("Teacher status change failed:", error);
      // Undo the change shown at once.
      setTeachers((list) => list.map((t) => (idOf(t) === id ? { ...t, status: teacher.status } : t)));
      setListError(serviceError(error, active ? `reactivate ${name}` : `deactivate ${name}`));
    } finally {
      setBusyId(null);
    }
  };

  const field = (key, label, props = {}) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {props.required && " *"}
      </span>
      <Input value={form[key]} onChange={(v) => setField(key, v)} {...props} />
    </label>
  );

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h2 className={ui.pageTitle}>Teachers</h2>
          <p className={ui.pageSubtitle}>Search, view and update teacher profiles, add a new one, or deactivate and reactivate a teacher's login.</p>
        </div>
        <Button variant="filled" onClick={openCreate} disabled={localLogin} startIcon={<UserPlus size={16} />}>
          Add Teacher
        </Button>
      </div>

      {localLogin && (
        <div className={`${ui.notice} ${ui.noticeInfo}`} role="note">
          <Info size={16} aria-hidden="true" />
          <span>
            You're logged in with the local admin account, which can't reach the teacher service. Log in with an
            ADMIN account (one-time code) to manage teachers.
          </span>
        </div>
      )}
      {notice && (
        <div className={`${ui.notice} ${ui.noticeSuccess}`} role="status">
          <Info size={16} aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {listError && (
        <div className={`${ui.notice} ${ui.noticeInfo}`} role="alert">
          <Info size={16} aria-hidden="true" />
          <span>{listError}</span>
        </div>
      )}

      {editor && (
        <section className={ui.card}>
          <div className={styles.editorHead}>
            <h3 className={ui.cardTitle}>
              {editor.mode === "create" ? "Add a teacher profile" : `Edit ${fullName(editor.teacher)}`}
            </h3>
            <button type="button" className={styles.iconButton} onClick={() => setEditor(null)} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <form className={styles.editor} onSubmit={save} noValidate>
            <p className={styles.groupTitle}>Basic information</p>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Title</span>
                <Select
                  value={form.title}
                  onChange={(v) => setField("title", v)}
                  options={TITLE_OPTIONS}
                  placeholder="Select"
                />
              </label>
              {field("first_name", "First name", { required: true })}
              {field("middle_name", "Middle name")}
              {field("last_name", "Last name", { required: true })}
              {field("main_subject", "Main subject", { required: true })}
              {field("current_job_title", "Current job title")}
              {field("highest_qualification_1", "Highest qualification")}
              {field("highest_qualification_2", "Second qualification")}
              {field("nationality", "Nationality")}
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Summary</span>
              <textarea
                className={styles.textarea}
                value={form.summary}
                maxLength={500}
                onChange={(e) => setField("summary", e.target.value)}
              />
            </label>

            <p className={styles.groupTitle}>Contact and address</p>
            <div className={styles.grid}>
              {field("mobile", "Mobile", { required: true, type: "tel" })}
              {field("whatsapp", "WhatsApp", { type: "tel" })}
              {field("primary_email", "Email", { required: true, type: "email" })}
              {field("secondary_email", "Secondary email", { type: "email" })}
              {field("city", "City")}
              {field("state", "State")}
              {field("pin_code", "PIN code")}
              {field("full_address", "Full address")}
            </div>

            {editor.mode === "create" && (
              <p className={styles.hint}>
                The profile is created without a login: the teacher can only sign in after joining with the same
                email or mobile.
              </p>
            )}
            {formError && (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="button" variant="text" onClick={() => setEditor(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="filled" disabled={saving}>
                {saving ? "Saving..." : editor.mode === "create" ? "Create Profile" : "Save Changes"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className={ui.card}>
        <form className={styles.filters} onSubmit={search}>
          <Input value={filters.name} onChange={(v) => setFilter("name", v)} placeholder="Name" />
          <Input value={filters.subject} onChange={(v) => setFilter("subject", v)} placeholder="Subject" />
          <Input value={filters.city} onChange={(v) => setFilter("city", v)} placeholder="City" />
          <Input value={filters.qualification} onChange={(v) => setFilter("qualification", v)} placeholder="Qualification" />
          <Select value={filters.status} onChange={(v) => setFilter("status", v)} options={STATUS_OPTIONS} placeholder="Any status" />
          <Button type="submit" variant="filled" disabled={localLogin} startIcon={<Search size={16} />}>
            Search
          </Button>
        </form>

        {loadState === "error" && (
          <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
            <Info size={16} aria-hidden="true" />
            <span>Couldn't load the teachers. Please try again.</span>
          </div>
        )}

        {teachers.length === 0 ? (
          <div className={ui.emptyState}>
            <span className={ui.emptyIcon}>
              <Inbox size={20} />
            </span>
            <p className={ui.emptyTitle}>{loadState === "loading" ? "Loading teachers…" : "No teachers found"}</p>
            {loadState === "ready" && <p className={ui.emptyText}>Try other filters, or add a teacher.</p>}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Teacher</th>
                <th className={styles.th}>Subject</th>
                <th className={styles.th}>City</th>
                <th className={styles.th}>Contact</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, index) => {
                const id = idOf(t) || `row-${index}`;
                const expanded = expandedId === id;
                return (
                  <Fragment key={id}>
                    <tr className={styles.row}>
                      <td className={styles.td} data-label="Teacher">
                        <div className={styles.nameCell}>
                          <PersonAvatar
                            src={pick(t, "profile_photo_url", "profilePhotoUrl")}
                            name={[t.first_name, t.last_name].filter(Boolean).join(" ")}
                            className={styles.avatar}
                          />
                          <span>
                            <strong>{fullName(t)}</strong>
                            {t.current_job_title && <span className={styles.sub}>{t.current_job_title}</span>}
                          </span>
                        </div>
                      </td>
                      <td className={styles.td} data-label="Subject">{t.main_subject || "—"}</td>
                      <td className={styles.td} data-label="City">{t.address?.city || "—"}</td>
                      <td className={styles.td} data-label="Contact">
                        {pick(t.contact, "primary_email", "primaryEmail") || "—"}
                        {t.contact?.mobile && <span className={styles.sub}>{t.contact.mobile}</span>}
                      </td>
                      <td className={styles.td} data-label="Status">
                        <span className={`${ui.chip} ${t.status === "ACTIVE" ? ui.chipLive : ui.chipNeutral}`}>
                          {STATUS_LABEL[t.status] || t.status || "—"}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdActions}`}>
                        <button
                          type="button"
                          className={ui.linkButton}
                          onClick={() => setExpandedId(expanded ? null : id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                        {t.status !== "DELETED" && idOf(t) && (
                          <button type="button" className={ui.linkButton} onClick={() => openEdit(t)}>
                            Edit
                          </button>
                        )}
                        {idOf(t) && t.status === "ACTIVE" && (
                          <button
                            type="button"
                            className={ui.linkButton}
                            onClick={() => void changeLogin(t, false)}
                            disabled={busyId === idOf(t)}
                          >
                            Deactivate
                          </button>
                        )}
                        {idOf(t) && (t.status === "INACTIVE" || t.status === "DELETED") && (
                          <button
                            type="button"
                            className={ui.linkButton}
                            onClick={() => void changeLogin(t, true)}
                            disabled={busyId === idOf(t)}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className={styles.detailRow}>
                        <td colSpan={6}>
                          <TeacherDetails teacher={t} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

/** Everything on the profile, read-only. */
const TeacherDetails = ({ teacher: t }) => {
  const dob = t.dob ? [t.dob.day, t.dob.month, t.dob.year].filter(Boolean).join("/") : "";
  const facts = [
    ["Teacher ID", idOf(t)],
    ["Date of birth", dob],
    ["Age", t.age],
    ["Nationality", t.nationality],
    ["Additional subjects", (t.additional_subjects || []).join(", ")],
    ["Classes taught", (t.classes_taught || []).join(", ")],
    ["Languages", (t.languages || []).map((l) => `${l.language} (${l.proficiency})`).join(", ")],
    ["Highest qualification", [t.highest_qualification_1, t.highest_qualification_2].filter(Boolean).join(", ")],
    ["WhatsApp", t.contact?.whatsapp],
    ["Secondary email", pick(t.contact, "secondary_email", "secondaryEmail")],
    [
      "Address",
      [pick(t.address, "full_address", "fullAddress"), t.address?.city, t.address?.state, pick(t.address, "pin_code", "pinCode")]
        .filter(Boolean)
        .join(", "),
    ],
    ["Profile score", pick(t, "profileScore", "profile_score")],
    ["Visible to schools", (pick(t, "isProfileVisible", "is_profile_visible") ?? true) ? "Yes" : "No"],
    ["Verified", pick(t, "profileVerified", "profile_verified") ? "Yes" : "No"],
    ["Joined", formatDate(pick(t, "createdAt", "created_at"))],
    ["Resumes", (t.resumes || []).length],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");

  return (
    <div className={styles.details}>
      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      {t.summary && <p className={styles.summary}>{t.summary}</p>}

      {(t.qualifications || []).length > 0 && (
        <>
          <p className={styles.groupTitle}>Qualifications</p>
          <ul className={styles.list}>
            {t.qualifications.map((q, i) => (
              <li key={i}>
                <strong>{[q.degree, q.course].filter(Boolean).join(" in ") || q.class_level}</strong>
                {[q.college || q.school_name, q.university, pick(q, "year_passed", "yearPassed"), q.percentage && `${q.percentage}%`]
                  .filter(Boolean)
                  .map((v) => ` · ${v}`)}
              </li>
            ))}
          </ul>
        </>
      )}

      {(t.experiences || []).length > 0 && (
        <>
          <p className={styles.groupTitle}>Experience</p>
          <ul className={styles.list}>
            {t.experiences.map((e, i) => (
              <li key={i}>
                <strong>{pick(e, "post_held", "postHeld")}</strong> at {pick(e, "school_name", "schoolName")}
                {` · ${pick(e, "start_date", "startDate") || "?"} – ${
                  pick(e, "is_current_employer", "isCurrentEmployer") ? "Present" : pick(e, "end_date", "endDate") || "?"
                }`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AdminTeachers;
