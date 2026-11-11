import { beforeEach, describe, expect, it } from "vitest";
import { OWNER_KEY, switchStorageOwner } from "./userStorage";

/** Minimal in-memory Storage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

describe("switchStorageOwner", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it("keeps the same user's data", () => {
    switchStorageOwner("teacher-1", storage);
    storage.setItem("skooljobs_saved_jobs", '["a"]');

    switchStorageOwner("teacher-1", storage);

    expect(storage.getItem("skooljobs_saved_jobs")).toBe('["a"]');
  });

  it("hides one user's data from the next user and gives it back on their return", () => {
    switchStorageOwner("teacher-1", storage);
    storage.setItem("skooljobs_saved_jobs", '["a"]');
    storage.setItem("skooljobs_teacher_data", '{"firstName":"Asha"}');

    switchStorageOwner("teacher-2", storage);
    expect(storage.getItem("skooljobs_saved_jobs")).toBeNull();
    expect(storage.getItem("skooljobs_teacher_data")).toBeNull();
    storage.setItem("skooljobs_saved_jobs", '["b"]');

    switchStorageOwner("teacher-1", storage);
    expect(storage.getItem("skooljobs_saved_jobs")).toBe('["a"]');
    expect(storage.getItem("skooljobs_teacher_data")).toBe('{"firstName":"Asha"}');

    switchStorageOwner("teacher-2", storage);
    expect(storage.getItem("skooljobs_saved_jobs")).toBe('["b"]');
  });

  it("leaves the shared school/teacher hand-off keys alone", () => {
    switchStorageOwner("school-1", storage);
    storage.setItem("skooljobs_interviews", "[1]");
    storage.setItem("skooljobs_applicants", "[2]");

    switchStorageOwner("teacher-1", storage);

    expect(storage.getItem("skooljobs_interviews")).toBe("[1]");
    expect(storage.getItem("skooljobs_applicants")).toBe("[2]");
  });

  it("treats the stored currentUser as the owner of data written before the owner key existed", () => {
    storage.setItem("currentUser", JSON.stringify({ id: "old-user" }));
    storage.setItem("skooljobs_applied_jobs", '["x"]');

    switchStorageOwner("new-user", storage);
    expect(storage.getItem("skooljobs_applied_jobs")).toBeNull();
    expect(storage.getItem(OWNER_KEY)).toBe("new-user");

    switchStorageOwner("old-user", storage);
    expect(storage.getItem("skooljobs_applied_jobs")).toBe('["x"]');
  });
});
