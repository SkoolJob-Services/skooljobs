import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  Configuration,
  DocumentApi,
  DocumentStatusEnum,
  type AddDocumentRequest,
  type Document,
  type UploadSessionRequest,
} from "@app/document-api";
import { mockApiEnabled } from "../api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";

/**
 * document-management (through the generated @app/document-api client): teacher photos and
 * resumes, school logos, cover photos and gallery photos are stored there (storage + document
 * record). The profiles keep only a reference, "document:<documentId>", in their URL fields
 * (profile_photo_url, resumes[].file_url, logoUrl, coverImageUrl, galleryImageUrls).
 *
 * - Files up to the inline limit: addDocument (POST /documents, base64) → 202 with documentId.
 * - Larger files: createUploadSession (POST /documents/upload-sessions) → PUT to the presigned
 *   URL → completeUpload (POST /documents/{id}/complete).
 * - Reading: getDocument (GET /documents/{id}) → base64Content (small) or downloadUrl (large).
 */

/**
 * SkoolJobs document type codes. Since documentmanagement-contracts 0.0.3 the service keeps no
 * list of types: each app sends its own code (A–Z, 0–9 and _, starting with a letter, 2–64
 * characters). The code is also part of the storage path, so don't rename one in use.
 */
export const DOCUMENT_TYPES = {
  TEACHER_PROFILE_PHOTO: "TEACHER_PROFILE_PHOTO",
  TEACHER_RESUME: "TEACHER_RESUME",
  SCHOOL_LOGO: "SCHOOL_LOGO",
  SCHOOL_COVER_PHOTO: "SCHOOL_COVER_PHOTO",
  SCHOOL_GALLERY_PHOTO: "SCHOOL_GALLERY_PHOTO",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

/** Same rule as the contract's DocumentTypes.PATTERN. */
export const DOCUMENT_TYPE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

/** document-management accepts up to 500 KB decoded inline (document.storage.inline-max-bytes); stay under it. */
const INLINE_LIMIT_BYTES = 450 * 1024;
/** document.storage.max-bytes. */
const MAX_BYTES = 50 * 1024 * 1024;
const SOURCE_SYSTEM = "SKOOLJOBS_APP";

/** Prefix of a document reference kept in a profile's URL field. A valid URI, so format: uri accepts it. */
const REF_PREFIX = "document:";

export const toDocumentRef = (documentId: string): string => `${REF_PREFIX}${documentId}`;

/** The documentId of a "document:<id>" reference; null for anything else (http/blob URLs, empty). */
export function documentIdOf(value: string | null | undefined): string | null {
  return typeof value === "string" && value.startsWith(REF_PREFIX) && value.length > REF_PREFIX.length
    ? value.slice(REF_PREFIX.length)
    : null;
}

// The package pins its own axios version; the shared instance is runtime-compatible.
type GeneratedAxios = ConstructorParameters<typeof DocumentApi>[2];
const documentApi = new DocumentApi(
  new Configuration({ basePath: API_BASE_PATHS.document }),
  undefined,
  serviceHttp as unknown as GeneratedAxios,
);

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(base64: string, contentType = "application/octet-stream"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Error code of a document-management ErrorResponse ({ code, message }), if any. */
const errorCodeOf = (error: unknown): string | undefined =>
  isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;

/** Files kept in memory by `npm run dev:mock` (gone after a reload). */
const mockFiles = new Map<string, Blob>();

export interface UploadInput {
  /** Id of the record the document belongs to (the teacher's user id, the school's schoolProfileId). */
  ownerId: string;
  documentType: DocumentType;
  file: File | Blob;
  /** Defaults to the File's name. */
  fileName?: string;
}

/** Uploads a file and returns its documentId. */
export async function uploadDocument({ ownerId, documentType, file, fileName }: UploadInput): Promise<string> {
  const name = fileName ?? (file instanceof File ? file.name : "file");
  const contentType = file.type || "application/octet-stream";
  if (!ownerId) throw new Error("Save your profile first, then upload the file.");
  if (!DOCUMENT_TYPE_PATTERN.test(documentType)) throw new Error(`Invalid document type: ${documentType}`);
  if (file.size > MAX_BYTES) throw new Error("The file is larger than 50 MB.");

  if (mockApiEnabled) {
    const documentId = crypto.randomUUID();
    mockFiles.set(documentId, file);
    return documentId;
  }

  if (file.size <= INLINE_LIMIT_BYTES) {
    const request: AddDocumentRequest = {
      ownerId,
      documentType,
      fileName: name,
      contentType,
      base64Content: await blobToBase64(file),
      sourceSystem: SOURCE_SYSTEM,
    };
    const { data } = await documentApi.addDocument(request);
    if (!data?.documentId) throw new Error("The document service didn't return a document ID.");
    return data.documentId;
  }

  const request: UploadSessionRequest = {
    ownerId,
    documentType,
    fileName: name,
    contentType,
    sizeBytes: file.size,
    sourceSystem: SOURCE_SYSTEM,
  };
  const { data: session } = await documentApi.createUploadSession(request);
  if (!session.documentId || !session.uploadUrl) throw new Error("The document service didn't return an upload link.");
  // Presigned storage URL: plain fetch, no app headers or token.
  const put = await fetch(session.uploadUrl, {
    method: session.httpMethod ?? "PUT",
    headers: { "Content-Type": contentType, ...(session.headers ?? {}) },
    body: file,
  });
  if (!put.ok) throw new Error("Couldn't upload the file. Please try again.");
  // 400 DOC_UPLOAD_NOT_FOUND while storage hasn't settled yet: try again shortly.
  for (let attempt = 1; ; attempt++) {
    try {
      const { data: stored } = await documentApi.completeUpload(session.documentId);
      if (stored.status && stored.status !== DocumentStatusEnum.Valid) {
        throw new Error("The document service couldn't store the file. Please try again.");
      }
      return session.documentId;
    } catch (error) {
      if (attempt < 3 && errorCodeOf(error) === "DOC_UPLOAD_NOT_FOUND") {
        await wait(1000 * attempt);
        continue;
      }
      throw error;
    }
  }
}

/** Uploads a file and returns the reference to keep in the profile ("document:<id>"). */
export async function uploadDocumentRef(input: UploadInput): Promise<string> {
  return toDocumentRef(await uploadDocument(input));
}

/** The file of a document, from base64Content (small) or the short-lived downloadUrl (large). */
async function readDocument(doc: Document): Promise<Blob> {
  if (doc.status === DocumentStatusEnum.Invalid) throw new Error("This document was marked invalid.");
  if (doc.status === DocumentStatusEnum.UploadFailed) throw new Error("This document's upload didn't finish.");
  if (doc.base64Content) return base64ToBlob(doc.base64Content, doc.contentType);
  if (doc.downloadUrl) {
    const response = await fetch(doc.downloadUrl);
    if (!response.ok) throw new Error("Couldn't download the document.");
    return response.blob();
  }
  throw new Error("The document is still being processed.");
}

const blobs = new Map<string, Promise<Blob>>();

/** The file of a document (cached for the page's lifetime). */
export function fetchDocument(documentId: string): Promise<Blob> {
  let pending = blobs.get(documentId);
  if (!pending) {
    pending = (async () => {
      if (mockApiEnabled) {
        const file = mockFiles.get(documentId);
        if (!file) throw new Error("This file isn't available in mock mode after a reload.");
        return file;
      }
      const { data } = await documentApi.getDocument(documentId);
      return readDocument(data);
    })();
    pending.catch(() => blobs.delete(documentId));
    blobs.set(documentId, pending);
  }
  return pending;
}

/** Saves a stored document to the user's device under fileName. */
export async function downloadDocument(documentId: string, fileName: string): Promise<void> {
  const url = URL.createObjectURL(await fetchDocument(documentId));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Display URL for an image kept in a profile field: a "document:<id>" reference is fetched
 * from document-management and shown through an object URL (revoked on change/unmount);
 * any other value (an http(s) or blob: URL) is returned unchanged.
 */
export function useDocumentUrl(value: string | null | undefined): string | null {
  const documentId = documentIdOf(value);
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchDocument(documentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved({ id: documentId, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId]);

  if (!documentId) return value || null;
  return resolved?.id === documentId ? resolved.url : null;
}
