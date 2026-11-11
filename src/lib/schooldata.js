// NOTE: Dropdown option lists have moved to /dropdown/School_module/*.json and
// /dropdown/common/common.json (see dropdown-migration-plan.md). This file now keeps
// only computed pickers, mock/dashboard data, style maps, and a few currently-unused
// dropdown exports left in place pending review (see dropdown-cleanup-report.md).

// ─── School/Org Profile sections (section-tab config, not a dropdown) ─────────

export const profileSections = [
  { id: "basic", label: "Basic Information" },
  { id: "other", label: "Other Information" },
  { id: "social", label: "Social Links" },
  { id: "address", label: "Address / Location" },
];

// ─── Date picker arrays (computed) ───────────────────────────────────────────

export const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
export const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
export const years = Array.from({ length: 76 }, (_, i) => String(2025 - i));

// ─── Old demo records ────────────────────────────────────────────────────────
// Earlier versions seeded these into localStorage. They are matched by their exact demo id AND
// name/title, so real records are never touched, and removed when the school pages load.

const DEMO_JOBS = new Map([[1, "Math Teacher"], [2, "Science Teacher"], [3, "English Teacher"], [4, "Hindi Teacher"]]);
const DEMO_APPLICANTS = new Map([
  [1, "Rahul Sharma"], [2, "Priya Singh"], [3, "Amit Kumar"], [4, "Neha Patel"], [5, "Suresh Verma"],
]);
const DEMO_INTERVIEWS = new Map([
  [1, "Rahul Sharma"], [2, "Rahul Sharma"], [3, "Rahul Sharma"], [101, "Priya Singh"], [102, "Suresh Verma"],
]);

const isDemo = (demo, id, name) => demo.get(Number(id)) === name;

export const withoutDemoJobs = (list) =>
  Array.isArray(list) ? list.filter((j) => !isDemo(DEMO_JOBS, j.id, j.title)) : [];
export const withoutDemoApplicants = (list) =>
  Array.isArray(list) ? list.filter((a) => !isDemo(DEMO_APPLICANTS, a.id, a.name)) : [];
export const withoutDemoInterviews = (list) =>
  Array.isArray(list) ? list.filter((iv) => !isDemo(DEMO_INTERVIEWS, iv.id, iv.candidateName)) : [];
