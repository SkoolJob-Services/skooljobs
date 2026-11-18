import type { ImgHTMLAttributes } from "react";
import { useDocumentUrl } from "../services/documentService";

type DocumentImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** "document:<id>" reference (fetched from document-management), or a plain http(s)/blob: URL. */
  src: string | null | undefined;
};

/** <img> for profile images: shows nothing until a stored document has loaded. */
export function DocumentImage({ src, alt = "", ...rest }: DocumentImageProps) {
  const url = useDocumentUrl(src);
  if (!url) return null;
  return <img src={url} alt={alt} {...rest} />;
}
