import { useState } from "react";
import { useDocumentUrl } from "../services/documentService";

const FALLBACK_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  background: "var(--color-light, #e8eef7)",
  color: "var(--color-primary, #1f3b63)",
  fontWeight: 700,
  textTransform: "uppercase",
};

/**
 * A person's photo: a stored "document:<id>" reference (loaded from document-management) or a
 * plain URL. While it loads, without a photo, or when it can't be loaded, the person's initials
 * are shown in the same box (`className` sizes and rounds both).
 */
export function PersonAvatar({ src, name = "", className, style }) {
  const url = useDocumentUrl(src);
  const [failedUrl, setFailedUrl] = useState(null);
  const initials =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "?";

  if (url && failedUrl !== url) {
    return <img src={url} alt={name} className={className} style={style} onError={() => setFailedUrl(url)} />;
  }
  return (
    <span className={className} style={{ ...FALLBACK_STYLE, ...style }} role="img" aria-label={name || "No photo"}>
      {initials}
    </span>
  );
}

export default PersonAvatar;
