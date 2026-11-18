import { useCallback, useEffect, useState } from "react";
import { getMySchoolProfile } from "../../services/schoolProfileService";

/**
 * The signed-in School Admin's own school (GET /school-profiles/me), shared by the school
 * layout (sidebar name and logo), View Profile and the profile editor.
 *
 * Saving is asynchronous: POST /school-profiles/update answers 202 and the change is stored a
 * moment later, so a GET straight after a save can still return the old version. The saved
 * values are therefore kept here for a short while and shown on top of what the server returns.
 */

const SAVED_KEY = "skooljobs_school_profile_saved";
/** How long the values of the last save win over the server's copy. */
const SAVED_TTL_MS = 60 * 1000;

function readSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) || "null");
    if (saved && Date.now() - saved.at < SAVED_TTL_MS) return saved.profile;
  } catch {
    // storage unavailable or damaged: use the server's copy
  }
  return null;
}

/** Call after a successful save (202) with the profile that was sent. */
export function rememberSavedSchoolProfile(profile) {
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify({ at: Date.now(), profile }));
  } catch {
    // storage unavailable: pages show the server's copy (possibly a moment old)
  }
  // Keep the name shown in headers in step (they read currentUser).
  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (profile?.schoolName) {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({ ...user, companyName: profile.schoolName, schoolName: profile.schoolName }),
      );
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SAVED_KEY));
}

/** Server copy with the last save (if recent) applied on top; null when there is neither. */
export function withRecentSave(server) {
  const saved = readSaved();
  if (!saved) return server;
  if (server?.schoolProfileId && saved.schoolProfileId && server.schoolProfileId !== saved.schoolProfileId) return server;
  return { ...(server || {}), ...saved };
}

/**
 * { profile, status: "loading" | "ready" | "none" | "error", refresh }.
 * "none" = no school yet (404: it is claimed from the invitation shortly after signup).
 */
export function useOwnSchoolProfile() {
  const [state, setState] = useState({ profile: withRecentSave(null), status: "loading" });

  const refresh = useCallback(() => {
    let cancelled = false;
    getMySchoolProfile()
      .then(({ data }) => {
        if (!cancelled) setState({ profile: withRecentSave(data || null), status: "ready" });
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status === 404 ? "none" : "error";
        setState((prev) => ({ profile: withRecentSave(prev.profile), status }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  // Another page saved the profile: show it straight away.
  useEffect(() => {
    const onSaved = () => setState((prev) => ({ ...prev, profile: withRecentSave(prev.profile) }));
    window.addEventListener(SAVED_KEY, onSaved);
    return () => window.removeEventListener(SAVED_KEY, onSaved);
  }, []);

  return { ...state, refresh };
}
