import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import PageBanner from "../components/PageBanner";
import { CONTACT_INFO, SOCIAL_LINKS } from "../siteConfig";
import { sendContactMessage, validateContact } from "../services/contactService";
import styles from "./ContactPage.module.css";

const EMPTY = { name: "", email: "", subject: "", message: "" };

export default function ContactPage() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      await sendContactMessage(values);
      setStatus("sent");
      setValues(EMPTY);
    } catch {
      setStatus("failed");
    }
  };

  const field = (key, label, props = {}) => {
    const Tag = props.as || "input";
    return (
      <div className={styles.field}>
        <label htmlFor={`contact-${key}`} className={styles.srOnly}>
          {label}
        </label>
        <Tag
          id={`contact-${key}`}
          placeholder={label}
          value={values[key]}
          onChange={set(key)}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `contact-${key}-error` : undefined}
          type={props.type}
          autoComplete={props.autoComplete}
        />
        {errors[key] && (
          <span id={`contact-${key}-error`} className={styles.error}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <PageBanner variant="darkCircles" tag="Contact Us" title="We're here to help">
        Whether you are a school looking to hire or a teacher looking for your next role our team responds within{" "}
        <strong>24 hours.</strong>
      </PageBanner>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.left}>
            <h2>Get In Touch</h2>
            <div className={styles.item}>
              <div className={styles.icon}>
                <MapPin size={20} />
              </div>
              <div>
                <h4>Address</h4>
                <p>{CONTACT_INFO.address}</p>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.icon}>
                <Phone size={20} />
              </div>
              <div>
                <h4>Phone</h4>
                <p>
                  <a href={CONTACT_INFO.phoneHref}>{CONTACT_INFO.phone}</a>
                </p>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.icon}>
                <Mail size={20} />
              </div>
              <div>
                <h4>Email</h4>
                <p>
                  <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
                </p>
              </div>
            </div>
            <div className={styles.map}>
              <iframe
                src="https://maps.google.com/maps?q=Delhi&t=&z=12&ie=UTF8&iwloc=&output=embed"
                title="Office location"
                loading="lazy"
              />
            </div>
            <div className={styles.social}>
              {SOCIAL_LINKS.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
                  {s.short}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.form}>
            <h3>Send us a message</h3>
            <p>Have questions, feedback, or need assistance? We&apos;d love to hear from you.</p>

            {status === "sent" && (
              <div className={styles.success} role="status">
                Thanks! Your email app has opened with your message — press send there and our team will reply within 24
                hours.
              </div>
            )}
            {status === "failed" && (
              <div className={styles.failed} role="alert">
                Your message couldn&apos;t be sent. Please email us at {CONTACT_INFO.email}.
              </div>
            )}

            <form noValidate onSubmit={submit}>
              {field("name", "Your Name", { autoComplete: "name" })}
              {field("email", "Email Address", { type: "email", autoComplete: "email" })}
              {field("subject", "Subject")}
              {field("message", "Your Message", { as: "textarea" })}
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
