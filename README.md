# skooljobs

SkoolJobs web app (React + Vite, installable PWA, Android build via Capacitor).
Teachers find jobs and apply; schools post jobs and manage applicants; SkoolJobs
admins review jobs and schools.

## Run

```bash
export NEXUS_NPM_AUTH=<base64 of user:password>   # Nexus npm registry, see .npmrc
npm install
npm run dev:mock   # in-browser mock signup service, OTP is always 123456
npm run dev        # against real services (copy .env.example to .env.local)
npm run build && npm run preview
npm test           # unit tests;  npm run typecheck  checks the TypeScript parts
```

Mock logins pick the role from the email/phone: contains `headadmin` → Head admin,
`admin` → SkoolJobs admin, `member` → School member, `school` → School admin,
anything else → Teacher (e.g. `school@test.com`, `teacher@test.com`).

## Login, signup and invites

Same pages and code as **cattlemgmtapp**, against the signup service
(`@app/signup-api`, base path `API_BASE_URL`, default `/api/signup`):

| Page | Flow |
|---|---|
| `/login` → `/login/verify` | OTP to email or phone → access token |
| `/signup` → `/signup/verify` → `/signup/done` | Teacher self-signup (tenant `selfSignupTypes`: `TEACHER`) |
| `/invite?token=…` → `/invite/verify` | Schools and school members join by invite |

- Every request carries `X-Client-Id` / `X-Tenant-Code` (`CLIENT_ID`, `TENANT_CODE`) and,
  after login, `Authorization: Bearer <token>` — also the job/school/teacher/application
  clients in `src/services` (`serviceHttp` in `src/api/httpClient.ts`).
- The role comes from the token (`src/features/auth/roles.ts`):

  | Backend role | Area |
  |---|---|
  | `ADMIN` | `/admin` |
  | `HEAD_ADMIN` (not in the backend mapping yet) | `/head-admin` |
  | `SCHOOL_ADMIN`, `SCHOOL_MEMBER` | `/school` |
  | `TEACHER` | `/teacher` |

- The existing pages read the user from `localStorage.currentUser`; `src/features/auth/legacyUser.ts`
  keeps it in step with the session (`role`: `admin` / `headAdmin` / `employer` / `candidate`).
  New code should use `useAuth()`.

Code layout: `src/api` (signup client + mock), `src/config/env.ts` (runtime settings),
`src/features/{auth,login,signup,invite,tenant}`, `src/components/auth`, `src/styles/auth.css`.
The rest of the app (`src/pages`, `src/layouts`, `src/components`, `src/services`) is JavaScript.

## Deployment

Built and deployed like every UI app (ci-library):

- **CI** `platform-frontend-build`: `npm ci`, `npm run test:ci`, `npm run build`, image
  `repo.cloudstry.com:8085/<org>/app/skooljobs:<version>-<build>` (version from `package.json`).
- **CD** `platform-deploy`: settings from the deployment repo `apps/skooljobs/<env>.env`
  (`API_BASE_URL`, `CLIENT_ID`, `TENANT_CODE`, `DEFAULT_COUNTRY_CODE`, `USE_MOCK_API`, optional `APP_PORT`),
  written into `/env.js` when the container starts — one image for every environment.
- Routes (domain, `/api/<service>/`, HTTPS) come from the edge pipeline: `/` → `skooljobs:<APP_PORT>`,
  `/api/signup/`, `/api/job/`, `/api/school-profile/`, `/api/teacher-profile/`, `/api/application/`,
  `/ws/notifications`.

## Other

- `API Specification/`, `Datamodel/`: shown at `/api-specification-and-datamodel`; `npm run swagger` serves the spec locally.
- `dropdown/`: option lists used by the forms; notes in `docs/`.
- `android/`, `capacitor.config.json`: Android app (`npx cap sync android` after `npm run build`).
