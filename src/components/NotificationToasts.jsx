import { useEffect } from "react";
import { X } from "lucide-react";
import styles from "./styles/NotificationToasts.module.css";

const AUTO_DISMISS_MS = 5000;

const TYPE_CLASS = {
  SUCCESS: styles.success,
  ERROR: styles.error,
  WARNING: styles.warning,
  INFO: styles.info,
};

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeClass = TYPE_CLASS[String(toast.msgType).toUpperCase()] || styles.info;

  return (
    <div
      className={`${styles.toast} ${typeClass}`}
      role={String(toast.msgType).toUpperCase() === "ERROR" ? "alert" : "status"}
    >
      <p className={styles.message}>{toast.message}</p>
      <button
        type="button"
        className={styles.closeButton}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const NotificationToasts = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default NotificationToasts;
