interface FormAlertProps {
  message?: string | null;
  tone?: "error" | "info" | "success";
}

/** Form-level message shown above the submit button. */
export function FormAlert({ message, tone = "error" }: FormAlertProps) {
  if (!message) return null;
  return (
    <div className={`form-alert form-alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {message}
    </div>
  );
}
