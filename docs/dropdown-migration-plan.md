# Dropdown Centralization — Migration Plan

**Date:** 2026-06-06
**Status:** Migration IMPLEMENTED & compile-verified. Two follow-ups need your OK
(see "Implementation status" below).

---

## Pass 2 — inline `<Select>` sweep + catalog sync (2026-06-06)

After a full `<Select>`/`options=` audit cross-checked against
`Datamodel/dropdown.json` (the master catalog), these previously-missed **inline**
dropdowns were centralized and their values upgraded to the catalog's richer lists:

| App location | Dropdown | → JSON key | Value change |
|---|---|---|---|
| TeacherProfile 866 | Title | `Teacher_module/myprofile.json#Title` | same (6) |
| TeacherProfile 912 | Current job title | `…#Current_job_title` | 5 → 14 |
| TeacherProfile 920 | Main subject | `…#Main_subject` | 4 → 18 |
| TeacherProfile 1005/1014 | Classes taught | `…#Class` | 5 → 18 |
| TeacherProfile 1274/1809 | Qualification class level | `qualifications.json#class_levels` | new key (2) |
| TeacherProfile 1539/1978 | Achievement award type | `…#Achievement_award_type` | same (3) |
| TeacherProfile 1587/2014 | Achievement course type | `…#Achievement_course_type` | same (3) |
| TeacherProfile 1695 | Resume format | `…#Resume_format` | +DOCX (2 → 3) |
| SchoolProfile 341 | Public view | `School_module/profile.json#Public_view` | same |
| SchoolProfile 471 | Bus service | `…#Bus_service` | same (objects) |

Catalog-value upgrades also applied to existing keys: `common#Language` 10→15,
`profile#Country` 6→8, `profile#Indian_state` 22→37, qualifications
`universities` 8→15 / `colleges` 6→11, experience `subjects` 19→22.
`Nationality` kept the existing ~190 list (already richer than the catalog's ~150).

**Left inline intentionally (not static catalog data):** language-type toggle
(`LanguageRequirements`), experience-range filter (`SchoolAllApplicants`), cover-letter
job list + saved-resume list (mock/derived), `establishmentYears`/`days`/`months`/`years`
(computed). Final `vite build` ✓ green (1896 modules).

---

## Implementation status (2026-06-06)

**Done & verified:**
- Created `/dropdown/{common,School_module,Teacher_module}/*.json` (root, per-page).
- Repointed every live consumer (6 post-job components, 5 school pages, TeacherProfile)
  to read from JSON via `import x from "../../../dropdown/.../x.json"`.
- Large lists (≈190 nationalities etc.) generated directly from source → zero loss.
- **Proven to compile:** a temporary `export` of `PUBLISH_OPTIONS` produced a clean
  `vite build` (1896 modules, ✓). The temp change was reverted.

**Resolved (with your approval):**
- `PUBLISH_OPTIONS` — a pre-existing uncommitted WIP edit had renamed
  `PUBLISH_SETTINGS` → `PUBLISH_OPTIONS`, added lucide icon objects, but dropped the
  `export` keyword and the icon import (HEAD built fine; the working copy didn't).
  Fix applied: `export const PUBLISH_OPTIONS` + `import { Zap, CalendarClock } from
  "lucide-react"`. Left in `postjobOptions.js` as UI config (icons can't live in JSON).
- **Lib cleanup done:** removed the migrated dropdown definitions from
  `postjobOptions.js`, `schooldata.js`, `teacherdata.js`. Kept computed pickers
  (`days`/`months`/`years`), mock/dashboard data, helpers, the PIN→state lookup, and
  the confirmed-unused dropdown exports (left in place + flagged in the cleanup report
  for your separate approval before deletion).

**Final `npm run build`: ✓ green (1896 modules, ~0.9s).**

**Dead-export cleanup DONE:** the confirmed-unused exports (`MONTHLY_BENEFITS`,
`ANNUAL_BENEFITS`, `titles`, `jobTypes`, `teachingMediums`, `expectedSalaryRanges`,
`experienceYears`, `teachingSubjects`, `classesList`, `schoolTypes`, `affiliationStatus`,
`staffStrength`, `studentStrength`) were copied into `/dropdown` JSON, then deleted from
the lib files. Pure backend enums (roles, notifications, activity_logs, packages, etc.)
were left in `Datamodel/dropdown.json` — see cleanup report §3/§3b. Build green.

Goal: move every dropdown/static option list out of components, pages, and `lib`
into `/dropdown/{Teacher_module,School_module,common}/*.json` and repoint imports.
**No UI / logic / styling changes.**

---

## 1. What counts as a "dropdown" here

During the audit I found 4 different kinds of data tangled together. Only the first
is cleanly JSON-migratable; the rest need a decision (see "Open decisions").

| Kind | Example | JSON-able? |
|------|---------|-----------|
| **A. Pure string-array option lists** | `sectors`, `MIN_QUALIFICATIONS`, `titles` | ✅ Yes |
| **B. Nested option maps** | `JOB_TITLE_GROUPS`, `SUBJECTS_BY_JOB_TITLE`, `qualificationOptions` | ✅ Yes (plain objects) |
| **C. Computed arrays** | `days/months/years`, `establishmentYears` (`Array.from`) | ⚠️ Not directly — JSON can't compute |
| **D. Icon/JSX-coupled config** | `PUBLISH_OPTIONS`, `ONLINE_PLATFORMS`, interview-mode radios | ❌ No — hold React components/functions |

Style maps (`statusChipClass`, `jobStatusChip`), nav configs (`navItems`,
`sidebarItems`), lookup maps (`pinStateMap`), and mock data (`initialJobs`,
`jobsData`, `TeacherData`) are **not dropdowns** and are excluded from migration.

---

## 2. Migration table — Common module

| Current location | Dropdown name | Target file → key |
|------------------|---------------|-------------------|
| `lib/teacherdata.js` | `nationalities` | `common/common.json` → `Nationality` |
| `lib/schooldata.js` | `countries` | `common/common.json` → `Country` |
| `lib/schooldata.js` | `indianStates` | `common/common.json` → `Indian_state` |
| `lib/schooldata.js` | `days`, `months`, `years` ⚠️C | `common/date_picker.json` (or keep computed) |
| `lib/teacherdata.js` | `languages` | `common/common.json` → `Language` |
| `lib/postjobOptions.js` | `INDIAN_LANGUAGES`, `FOREIGN_LANGUAGES` | `common/common.json` → `Indian_language`/`Foreign_language` |

## 3. Migration table — Teacher module

| Current location | Dropdown name | Target file → key |
|------------------|---------------|-------------------|
| `lib/teacherdata.js` | `titles` | `Teacher_module/myprofile.json` → `Title` |
| `lib/teacherdata.js` | `teachingSubjects` | `Teacher_module/myprofile.json` → `Main_subject` |
| `pages/teacher/TeacherProfile.jsx` | `ALL_ADDITIONAL_SUBJECTS` (inline) | `Teacher_module/myprofile.json` → `Additional_subject` |
| `lib/teacherdata.js` | `classesList` | `Teacher_module/myprofile.json` → `Class` |
| `lib/teacherdata.js` | `languageStatuses` | `Teacher_module/myprofile.json` → `Language_proficiency` |
| `lib/teacherdata.js` | `jobTypes` | `Teacher_module/myprofile.json` → `Preferred_job_type` |
| `lib/teacherdata.js` | `teachingMediums` | `Teacher_module/myprofile.json` → `Teaching_medium` |
| `lib/teacherdata.js` | `expectedSalaryRanges` | `Teacher_module/myprofile.json` → `Expected_salary` |
| `lib/teacherdata.js` | `experienceYears` | `Teacher_module/myprofile.json` → `Experience_year` |
| `lib/teacherdata.js` | `qualificationOptions` (degrees, courses, mediums, modes, universities, colleges) | `Teacher_module/qualifications.json` |
| `lib/teacherdata.js` | `experienceOptions` (boards, subjects, posts, reasons) | `Teacher_module/experience.json` |

## 4. Migration table — School module

| Current location | Dropdown name | Target file → key |
|------------------|---------------|-------------------|
| `lib/schooldata.js` | `sectors` | `School_module/profile.json` → `Sector` |
| `lib/schooldata.js` | `schoolTypes` | `School_module/profile.json` → `School_type` |
| `lib/schooldata.js` | `affiliationStatus` | `School_module/profile.json` → `Affiliation_status` |
| `lib/schooldata.js` | `schoolMediums` | `School_module/profile.json` → `Medium` |
| `lib/schooldata.js` | `levels` | `School_module/profile.json` → `Level` |
| `lib/schooldata.js` | `boards` | `School_module/profile.json` → `Board` |
| `lib/schooldata.js` | `industries` | `School_module/profile.json` → `Industry` |
| `lib/schooldata.js` | `staffStrength` | `School_module/profile.json` → `Staff_strength` |
| `lib/schooldata.js` | `studentStrength` | `School_module/profile.json` → `Student_strength` |
| `pages/school/SchoolProfile.jsx` | `studentCountOptions` (inline) | `School_module/profile.json` → `Student_count` |
| `pages/school/SchoolProfile.jsx` | `studentsPerClassOptions` (inline) | `School_module/profile.json` → `Students_per_class` |
| `lib/schooldata.js` | `subjects` | `School_module/postjob.json` → `Subject` |
| `lib/schooldata.js` | `schoolExperienceOptions` | `School_module/postjob.json` → `Experience_required` |
| `lib/schooldata.js` | `employmentTypes` | `School_module/postjob.json` → `Employment_type` |
| `components/postjob/RoleBasicInfo.jsx` | `EMPLOYMENT_TYPES` (inline, **dup**) | use `Employment_type` (delete dup) |
| `lib/postjobOptions.js` | `ROLE_CATEGORIES` | `School_module/postjob.json` → `Role_category` |
| `lib/postjobOptions.js` | `JOB_TITLE_GROUPS` (map) | `School_module/postjob.json` → `Job_title_group` |
| `lib/postjobOptions.js` | `SUBJECTS_BY_JOB_TITLE` (map) | `School_module/postjob.json` → `Subject_by_job_title` |
| `lib/postjobOptions.js` | `JOINING_TIMELINES` | `School_module/postjob.json` → `Joining_timeline` |
| `lib/postjobOptions.js` | `PROFICIENCY_LEVELS` | `School_module/postjob.json` → `Proficiency_level` |
| `lib/postjobOptions.js` | `MIN_QUALIFICATIONS` | `School_module/postjob.json` → `Min_qualification` |
| `lib/postjobOptions.js` | `ADDITIONAL_QUALIFICATIONS` | `School_module/postjob.json` → `Additional_qualification` |
| `lib/postjobOptions.js` | `CERTIFICATIONS` | `School_module/postjob.json` → `Certification` |
| `lib/postjobOptions.js` | `EXPERIENCE_OPTIONS` | `School_module/postjob.json` → `Experience` |
| `lib/postjobOptions.js` | `PREFERRED_SCHOOL_TYPES` | `School_module/postjob.json` → `Preferred_school_type` |
| `lib/postjobOptions.js` | `STUDENT_LEVELS` | `School_module/postjob.json` → `Student_level` |
| `lib/postjobOptions.js` | `COMPENSATION_STRUCTURES` | `School_module/postjob.json` → `Compensation_structure` |
| `lib/postjobOptions.js` | `MONTHLY_BENEFITS` | `School_module/postjob.json` → `Monthly_benefit` |
| `lib/postjobOptions.js` | `ANNUAL_BENEFITS` | `School_module/postjob.json` → `Annual_benefit` |
| `lib/postjobOptions.js` | `REQUIRED_SKILLS` | `School_module/postjob.json` → `Required_skill` |
| `lib/postjobOptions.js` | `TECHNICAL_SKILLS` | `School_module/postjob.json` → `Technical_skill` |
| `lib/postjobOptions.js` | `GENDER_PREFERENCES` | `School_module/postjob.json` → `Gender_preference` |
| `lib/postjobOptions.js` | `INTERVIEW_MODES` | `School_module/postjob.json` → `Interview_mode` |
| `lib/postjobOptions.js` | `PUBLISH_OPTIONS` ❌D (icons, **broken**) | labels → JSON; icons stay in component (see cleanup) |
| `components/postjob/SalaryBenefits.jsx` | `CONTRACT_DURATIONS`, `HOURS_PER_WEEK`, `WFH_DAYS`, `OFFICE_DAYS`, `TIMEZONES`, `INTERNSHIP_DURATIONS` (inline) | `School_module/postjob.json` (per-type keys) |
| `pages/school/SchoolJobDetail.jsx` | `salaryRanges` (inline) | `School_module/postjob.json` → `Salary_range` |
| `pages/school/SchoolAllApplicants.jsx` | `statusOptions` (inline) | `School_module/applicants.json` → `Applicant_status` |
| `pages/school/SchoolManageJobs.jsx` | `["Active","Paused","Draft","Closed"]` (inline) | `School_module/managejobs.json` → `Job_status` |
| `pages/school/SchoolInterviews.jsx` | `DURATIONS`, `ROUNDS`, `STATUSES` (inline) | `School_module/interviews.json` |
| `pages/school/SchoolInterviews.jsx` | `ONLINE_PLATFORMS` ❌D, `REMINDERS_ENABLED_MODES`, mode radios (icons) | stay in component (icon-coupled) |

---

## 3 file tree (proposed)

```text
/dropdown
├── /Teacher_module
│   ├── myprofile.json        (Title, Main_subject, Additional_subject, Class, ...)
│   ├── qualifications.json    (degrees, courses, mediums, modes, universities, colleges)
│   └── experience.json        (boards, subjects, posts, reasons)
├── /School_module
│   ├── profile.json           (Sector, School_type, Board, Level, strengths, ...)
│   ├── postjob.json           (Role_category, Subject, benefits, skills, ...)
│   ├── interviews.json        (Duration, Round, Status)
│   ├── applicants.json        (Applicant_status)
│   └── managejobs.json        (Job_status)
└── /common
    ├── common.json            (Nationality, Country, Indian_state, Language, ...)
    └── date_picker.json       (Day, Month, Year)  ← only if we hardcode the years
```

---

## Open decisions (blocking implementation)

1. **Folder location** — root `/dropdown` or `src/dropdown`? (Vite imports JSON fine
   from either; `src/` keeps it bundled cleanly.)
2. **File granularity** — the example implies **per-page** files (`myprofile.json`).
   Confirm per-page split vs. one file per module.
3. **Computed arrays (`days/months/years`, `establishmentYears`)** — JSON can't run
   `Array.from`. Hardcode the year list in JSON, or leave these as a tiny JS helper?
4. **Icon-coupled config (`PUBLISH_OPTIONS`, `ONLINE_PLATFORMS`, interview-mode
   radios)** — keep the icon mapping in the component and move only the text labels
   to JSON? (Recommended — icons can't live in JSON.)
5. **Nested maps (`JOB_TITLE_GROUPS`, `qualificationOptions`)** — migrate as nested
   JSON objects (yes, recommended) — confirm.
