/**
 * In-browser stand-in for the teacher-profile calls of Admin → Teachers, under
 * `npm run dev:mock` only (see teacherprofileService.js). Same response shapes as the
 * real service (Teacher JSON: snake_case fields, camelCase teacherId); teachers are
 * kept in localStorage and seeded with a few samples the first time.
 */
const TEACHERS_KEY = "skooljobs_mock_teachers";

const SAMPLES = [
  {
    teacherId: "6f1c2a3e-1111-4a1b-9c1d-000000000001",
    title: "Ms",
    first_name: "Ananya",
    last_name: "Sharma",
    main_subject: "Mathematics",
    current_job_title: "TGT Mathematics",
    highest_qualification_1: "M.Sc Mathematics",
    highest_qualification_2: "B.Ed",
    nationality: "Indian",
    summary: "Mathematics teacher with 6 years of CBSE experience.",
    status: "ACTIVE",
    contact: { mobile: "+919876500001", primary_email: "ananya.sharma@example.com" },
    address: { city: "Bhopal", state: "Madhya Pradesh", pin_code: "462001" },
  },
  {
    teacherId: "6f1c2a3e-2222-4a1b-9c1d-000000000002",
    title: "Mr",
    first_name: "Rahul",
    last_name: "Verma",
    main_subject: "Physics",
    current_job_title: "PGT Physics",
    highest_qualification_1: "M.Sc Physics",
    nationality: "Indian",
    status: "ACTIVE",
    contact: { mobile: "+919876500002", primary_email: "rahul.verma@example.com" },
    address: { city: "Indore", state: "Madhya Pradesh", pin_code: "452001" },
  },
  {
    teacherId: "6f1c2a3e-3333-4a1b-9c1d-000000000003",
    title: "Mrs",
    first_name: "Priya",
    last_name: "Nair",
    main_subject: "English",
    current_job_title: "Primary Teacher",
    highest_qualification_1: "M.A English",
    nationality: "Indian",
    status: "INACTIVE",
    contact: { mobile: "+919876500003", primary_email: "priya.nair@example.com" },
    address: { city: "Ujjain", state: "Madhya Pradesh" },
  },
];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEACHERS_KEY) || "null");
    if (Array.isArray(saved)) return saved;
  } catch {
    // damaged: start again from the samples
  }
  const seeded = SAMPLES.map((t) => ({ ...t, createdAt: new Date().toISOString() }));
  save(seeded);
  return seeded;
}

function save(list) {
  try {
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const accepted = (message) => ({ status: 202, data: { commandId: crypto.randomUUID(), status: "ACCEPTED", message } });
const has = (text, query) => !query || String(text || "").toLowerCase().includes(String(query).toLowerCase());

export const mockTeacherService = {
  async searchTeachers({ name, subject, city, qualification, status } = {}) {
    await delay();
    const list = load().filter(
      (t) =>
        has([t.first_name, t.middle_name, t.last_name].filter(Boolean).join(" "), name) &&
        has([t.main_subject, ...(t.additional_subjects || [])].join(" "), subject) &&
        has(t.address?.city, city) &&
        has([t.highest_qualification_1, t.highest_qualification_2].join(" "), qualification) &&
        // Like the service: deleted profiles only when asked for.
        (status ? t.status === status : t.status !== "DELETED"),
    );
    return { status: 200, data: list };
  },

  async createTeacher(teacher) {
    await delay();
    const list = load();
    list.unshift({ ...teacher, teacherId: crypto.randomUUID(), createdAt: new Date().toISOString() });
    save(list);
    return accepted("Create teacher command accepted.");
  },

  async updateTeacher(teacher) {
    await delay();
    const list = load();
    const index = list.findIndex((t) => t.teacherId === teacher.teacherId);
    if (index < 0) {
      const error = new Error("Teacher not found.");
      error.response = { status: 404, data: { code: "TEACHER_NOT_FOUND", message: "Teacher not found." } };
      throw error;
    }
    const changes = { ...teacher };
    delete changes.updated_sections;
    list[index] = { ...list[index], ...changes, updatedAt: new Date().toISOString() };
    save(list);
    return accepted("Update teacher command accepted.");
  },

  /** delete / deactivate / activate: only the status changes (the login status lives in signup). */
  async setStatus(teacherId, status) {
    await delay();
    const list = load();
    const index = list.findIndex((t) => t.teacherId === teacherId);
    if (index >= 0) {
      list[index] = { ...list[index], status, updatedAt: new Date().toISOString() };
      save(list);
    }
    return accepted(`Teacher status ${status} accepted.`);
  },
};
