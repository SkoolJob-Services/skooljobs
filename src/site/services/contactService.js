import { CONTACT_INFO } from "../siteConfig";

/**
 * Sends a contact-form message. There is no contact endpoint in the backend yet,
 * so this opens the visitor's email app with the message filled in, addressed to
 * the SkoolJobs inbox. Replace the body with an API call once one exists; the
 * page only needs this function to resolve on success or throw on failure.
 */
export async function sendContactMessage({ name, email, subject, message }) {
  const body = `${message}\n\n— ${name} (${email})`;
  const href = `mailto:${CONTACT_INFO.email}?subject=${encodeURIComponent(
    subject || `Website enquiry from ${name}`,
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  return { delivered: "email-client" };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns { field: message } for anything that needs fixing; empty when valid. */
export function validateContact({ name, email, message }) {
  const errors = {};
  if (!name.trim()) errors.name = "Please enter your name.";
  if (!email.trim()) errors.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please enter a valid email address.";
  if (!message.trim()) errors.message = "Please write a message.";
  else if (message.trim().length < 10) errors.message = "Please add a little more detail (at least 10 characters).";
  return errors;
}
