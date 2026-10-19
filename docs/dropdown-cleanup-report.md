# Dropdown Cleanup Report

**Date:** 2026-06-06
Companion to `dropdown-migration-plan.md`. Lists duplicates, dead/broken code, and
items to verify. **Nothing here is deleted without your confirmation.**

---

## 1. 🔴 Broken / dead code (needs a fix decision)

### `PUBLISH_OPTIONS` — broken export in `lib/postjobOptions.js:493`
- Declared `const PUBLISH_OPTIONS` (**not exported**).
- References `Zap` and `CalendarClock` icons that are **never imported** in the file.
- Yet `components/postjob/HiringPreferences.jsx:5` does
  `import { PUBLISH_OPTIONS } ...` and `.map()`s over it (line 58).
- **Effect:** the "Publish Settings" block in Post-a-Job is currently broken
  (undefined import / undefined icon refs).
- **Proposed fix during migration:** move the text (`val`, `sub`) to
  `School_module/postjob.json` → `Publish_option`, and keep an icon lookup
  (`{ "Publish Immediately": Zap, "Publish Later": CalendarClock }`) **inside
  HiringPreferences.jsx** with the icons imported there. Restores the feature
  without putting JSX in JSON.

---

## 2. 🟡 Duplicate definitions

| Value set | Defined in | Note |
|-----------|-----------|------|
| Employment types (6 identical values) | `schooldata.js` `employmentTypes` **and** `RoleBasicInfo.jsx` `EMPLOYMENT_TYPES` | Collapse to one key; delete inline dup |
| Job status list | `SchoolManageJobs.jsx` inline `["Active","Paused","Draft","Closed"]`, `SchoolJobDetail.jsx` `jobStatusChip` keys (+`Scheduled`) | Inconsistent (`Scheduled` missing in one). Unify to one `Job_status` source |
| "Subjects" lists (overlapping but **not** identical) | `schooldata.subjects`, `teacherdata.teachingSubjects`, `experienceOptions.subjects`, `SUBJECTS_BY_JOB_TITLE`, `ALL_ADDITIONAL_SUBJECTS` | Semantically different per context — **do not blindly merge**; keep separate keys, flag for product review |
| "Mediums" | `schooldata.schoolMediums`, `teacherdata.teachingMediums`, `qualificationOptions.mediums` | Overlap; keep per-context for now |
| "Boards" | `schooldata.boards`, `teacherdata.experienceOptions.boards` | Teacher list is a superset; keep separate |
| "Experience" scales | `schoolExperienceOptions`, `EXPERIENCE_OPTIONS`, `experienceYears` | Three different scales/wordings — intentional, keep separate |
| Year pickers | `schooldata.years`, `SchoolProfile.establishmentYears` | Both `Array.from(2025-i)`; can share one computed helper |

> Recommendation: dedupe only the **exact** duplicates (employment types, job status).
> The "overlapping but different" subject/medium/board/experience lists should be kept
> as distinct keys — merging them risks changing what each dropdown offers (violates
> "no options lost"). Flagged for product confirmation.

---

## 3. ✅ DEAD exports — now REMOVED (values preserved in JSON first)

These dropdown lists had no render site anywhere (full consumer grep = zero external
references). **Resolution (approved):** their values were first copied into the
`/dropdown` JSON (so nothing is lost), then the exports were **deleted** from the lib
files. Build green after removal.

| File | Removed export(s) | Value preserved at |
|------|-------------------|--------------------|
| `lib/teacherdata.js` | `jobTypes`, `teachingMediums`, `expectedSalaryRanges`, `experienceYears` | `Teacher_module/myprofile.json` → `Job_type` / `Teaching_medium` / `Expected_salary` / `Experience_year` |
| `lib/teacherdata.js` | `titles`, `teachingSubjects`, `classesList` | already migrated → `myprofile.json` `Title` / `Main_subject` / `Class` |
| `lib/schooldata.js` | `schoolTypes`, `affiliationStatus`, `staffStrength`, `studentStrength` | `School_module/profile.json` → `School_type` / `Affiliation_status` / `Staff_strength` / `Student_strength` |
| `lib/postjobOptions.js` | `MONTHLY_BENEFITS`, `ANNUAL_BENEFITS` | `School_module/postjob.json` → `Monthly_benefit` / `Annual_benefit` |

`PUBLISH_OPTIONS` was **kept** in `postjobOptions.js` (icon-coupled UI config) and its
missing `export`/icon-import was fixed so the build passes.

> Note: the new JSON keys for not-yet-wired fields (Job_type, School_type, benefits,
> etc.) are ready for when those Selects are added to the UI.

## 3b. 🟡 Backend / model enums — left in the Datamodel catalog (NOT in runtime /dropdown)

`Datamodel/dropdown.json` also lists pure backend enums that have **no UI Select** and
are data-model concerns, not user-facing dropdowns. These stay in the catalog +
`datamodel.json`; they were intentionally **not** copied into the runtime `/dropdown`
folder (would be data nothing imports):

`users.roles`, `notifications.types`, `activity_logs.action_types`,
`admin_actions.{entity_types,actions}`, `packages.{billing_cycles,subscription_statuses}`,
`otp_verifications.purposes`, `applications.{application_statuses,admin_override_actions}`,
`job_posting.{admin_review_statuses,job_statuses}`, `*.profile_status(es)`, `resume.sources`,
`common.boolean_options`. → Wire into `/dropdown` if/when a screen renders them.

## 4. ⚪ Keep — not dropdowns (excluded from migration)

- `schooldata.js`: `initialJobs`, `initialApplicants` (mock data), `statusChipClass` (style map),
  `profileSections` (section/tab config), `days`/`months`/`years` (computed)
- `teacherdata.js`: `TeacherData`, `jobsData`, `resumesData` (mock), `pinStateMap` (lookup),
  `formatRelativeTime` (helper)
- `postjobOptions.js`: `PUBLISH_OPTIONS` (icon-coupled — left as-is per decision)
- Pages/components: `establishmentYears` (computed), `ONLINE_PLATFORMS` / interview-mode
  radios (icon-coupled), `jobStatusChip` (style map), nav/sidebar/stats configs

Also kept in place: nav configs (`navItems`, `sidebarItems`), dashboard data
(`stats`, `barData`), and auth `MOCK_CREDENTIALS`. After extraction,
`schooldata.js` / `teacherdata.js` retain only mock data + helpers.

---

## 5. Net result after migration

- `lib/postjobOptions.js` → emptied of pure data; may retain only the icon map fix or
  be deleted entirely.
- `lib/schooldata.js` / `lib/teacherdata.js` → reduced to mock data + helpers.
- ~10 inline arrays removed from components/pages, repointed to `/dropdown` JSON.
- 2 exact duplicates collapsed; 1 broken feature (`PUBLISH_OPTIONS`) fixed.
