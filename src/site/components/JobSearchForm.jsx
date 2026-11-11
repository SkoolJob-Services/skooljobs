import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CITY_OPTIONS, EXPERIENCE_OPTIONS, SUBJECT_OPTIONS } from "../data/searchOptions";
import styles from "./JobSearchForm.module.css";

/**
 * Keyword / subject / city / experience search. Sends the visitor to /jobs with
 * the filters in the URL; onSearch is used instead when the form sits on /jobs.
 */
export default function JobSearchForm({ initial = {}, onSearch, variant = "hero" }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    q: initial.q || "",
    subject: initial.subject || "",
    location: initial.location || "",
    experience: initial.experience || "",
  });

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(values);
      return;
    }
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => v && params.set(k, v));
    navigate(`/jobs${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form className={`${styles.filter} ${styles[variant] || ""}`} onSubmit={submit} role="search">
      <input
        type="search"
        placeholder="Search Keywords"
        aria-label="Search keywords"
        value={values.q}
        onChange={set("q")}
      />
      <select aria-label="Subject" value={values.subject} onChange={set("subject")}>
        <option value="">Select Subject</option>
        {SUBJECT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select aria-label="City" value={values.location} onChange={set("location")}>
        <option value="">All Locations</option>
        {CITY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select aria-label="Experience" value={values.experience} onChange={set("experience")}>
        <option value="">Experience</option>
        {EXPERIENCE_OPTIONS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <button type="submit">Find Job</button>
    </form>
  );
}
