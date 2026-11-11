import { useRef, useState } from "react";
import { AlertTriangle, Check, Circle, Copy, Info, Link2, Link2Off, Loader2, RotateCw, Send } from "lucide-react";
import { Button, Input, useSnackbar } from "@cloudstrytech/ui-components";
import { authApi, isApiError, mockApiEnabled } from "../../api";
import { useAuth } from "../../features/auth/AuthContext";
import { isLocalSession } from "../../features/auth/localAccounts";
import { PhoneField } from "../../components/auth/PhoneField";
import { DEFAULT_COUNTRY_CODE, isEmail, isValidLocalNumber } from "../../lib/contact";
import { createSchoolProfile, getSchoolProfile, linkSchoolAdminInvite } from "../../services/schoolProfileService";
import { errorMessage, serviceErrorMessage } from "../../lib/errorMessages";
import { STEP, checkInvitationStatus, normalizeEmail, runInvitationSteps } from "./inviteSchoolWorkflow";
import ui from "./styles/AdminUi.module.css";
import styles from "./styles/AdminInviteSchools.module.css";

// The calls each workflow step makes (see inviteSchoolWorkflow.js).
const workflowApi = {
  createSchoolProfile,
  createInvite: (body) => authApi.createInvite(body),
  listInvites: (status) => authApi.listInvites(status),
  resendInvite: (inviteId) => authApi.resendInvite(inviteId),
  linkSchoolAdminInvite,
  getSchoolProfile,
};

const IDLE_PROGRESS = { [STEP.SCHOOL]: "idle", [STEP.INVITE]: "idle", [STEP.LINK]: "idle" };
const EMPTY_FLOW = { schoolProfileId: null, invite: null, inviteAttempted: false, linked: false };

// Signup's invite status → what the admin needs to know.
const INVITE_STATUS_TEXT = {
  PENDING: "Not accepted yet.",
  ACCEPTED: "Accepted: the administrator created their account.",
  EXPIRED: "Expired before it was accepted. Send a new invitation.",
  REVOKED: "Revoked.",
};

function failureMessage(step, error) {
  if (step === STEP.SCHOOL) return serviceErrorMessage(error, "schoolCreate");
  if (step === STEP.LINK) {
    // A request that got no usable answer reads like any service error; anything
    // else (no invitation ID returned) carries its own message.
    const fromService = isApiError(error) || error?.isAxiosError || error?.response;
    return fromService ? serviceErrorMessage(error, "schoolLink") : error?.message || errorMessage(error, "schoolLink");
  }
  // A 4xx the service explained ({ code, message }) shows that reason, e.g. which
  // role may not be invited. HTTP_<status> codes mean the body had none.
  const explained =
    isApiError(error) && error.status >= 400 && error.status < 500 && !error.code.startsWith("HTTP_");
  return explained && error.message?.trim() ? error.message.trim() : errorMessage(error, "inviteCreate");
}

const NO_SCHOOL_ID_MESSAGE =
  "No invitation was sent, because it couldn't be tied to the school. Don't retry: the school may " +
  "already exist and a retry could create a duplicate. Check with the backend team, then start over.";

const STEP_ICON = {
  accepted: Info,
  done: Check,
  failed: AlertTriangle,
  running: Loader2,
  unavailable: Link2Off,
  idle: Circle,
};

function ProgressStep({ status, title, detail }) {
  const Icon = STEP_ICON[status] ?? Circle;
  return (
    <li className={`${styles.progressStep} ${styles[`progress_${status}`] ?? ""}`}>
      <Icon size={16} aria-hidden="true" className={status === "running" ? styles.spin : undefined} />
      <div>
        <p className={styles.progressTitle}>{title}</p>
        <p className={styles.progressDetail}>{detail}</p>
      </div>
    </li>
  );
}

function formatDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
}

const blankForm = {
  firstName: "",
  lastName: "",
  email: "",
  countryCode: DEFAULT_COUNTRY_CODE,
  phone: "",
  schoolName: "",
  schoolAddress: "",
};

function validate(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = "Enter the administrator's first name.";
  if (!values.lastName.trim()) errors.lastName = "Enter the administrator's last name.";
  if (!values.email.trim()) errors.email = "Enter an email address.";
  else if (!isEmail(values.email.trim())) errors.email = "Enter a valid email address, like name@school.in.";
  if (!values.phone.trim()) errors.phone = "Enter a contact number.";
  else if (!isValidLocalNumber(values.countryCode, values.phone)) errors.phone = "Enter a valid contact number.";
  if (!values.schoolName.trim()) errors.schoolName = "Enter the school name.";
  return errors;
}

const AdminInviteSchools = () => {
  const { session } = useAuth();
  // `npm run dev:mock` only (never a production build, whatever env.js says):
  // invites come from mockAuthApi — test links only, nothing is emailed.
  const mockMode = mockApiEnabled;
  // A local (browser-only) admin login has no token the invite service accepts.
  const inviteApiAvailable = mockMode || !isLocalSession(session);

  const snackbar = useSnackbar();

  const [values, setValues] = useState(blankForm);
  const [errors, setErrors] = useState({});
  // Per step: idle | running | done | failed
  const [progress, setProgress] = useState(IDLE_PROGRESS);
  // What has been created so far; a retry continues from here and never repeats a step.
  const [flow, setFlow] = useState(EMPTY_FLOW);
  // { step, message, retryable, kind? } of the step that stopped the flow last
  // (kind "noSchoolId": school accepted without an id — not a failure)
  const [failure, setFailure] = useState(null);
  // A pending invite already sent to this email (nothing new was created)
  const [duplicate, setDuplicate] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [running, setRunning] = useState(false);
  // Ref guard: blocks a second run before the `running` re-render lands.
  const runningRef = useRef(false);
  const [copied, setCopied] = useState(false);
  // After linking: { inviteStatus, adminAssigned } from the services, the lookup error, and whether one runs.
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const invite = flow.invite;
  const sent = Boolean(invite);
  const started = running || Boolean(flow.schoolProfileId);
  // Once the school exists its details are fixed: retries must send the same data.
  const locked = started;
  const showProgress = started || Boolean(failure);
  const runningLabel =
    progress[STEP.LINK] === "running"
      ? "Linking invitation…"
      : progress[STEP.INVITE] === "running"
        ? "Sending invitation…"
        : "Creating school…";
  const linkFailure = failure?.step === STEP.LINK ? failure : null;

  const update = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setUnavailable(false);
    setDuplicate(null);
  };

  const runSteps = async () => {
    if (runningRef.current) return;
    // A non-retryable stop (4xx, or a school accepted without an id) only clears via Start over.
    if (failure && !failure.retryable) return;
    if (!flow.schoolProfileId) {
      const found = validate(values);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        const firstField = document.querySelector(`[name="${Object.keys(found)[0]}"]`);
        firstField?.focus();
        return;
      }
    }
    if (!inviteApiAvailable) {
      setUnavailable(true);
      return;
    }

    runningRef.current = true;
    setRunning(true);
    setFailure(null);
    setDuplicate(null);
    try {
      const { state, outcome } = await runInvitationSteps(values, flow, workflowApi, (step, status, current) => {
        setProgress((prev) => ({ ...prev, [step]: status }));
        setFlow(current);
      });
      setFlow(state);
      if (outcome.type === "duplicate") {
        setDuplicate(outcome.existing);
      } else if (outcome.type === "noSchoolId") {
        setFailure({ step: STEP.SCHOOL, kind: "noSchoolId", message: NO_SCHOOL_ID_MESSAGE, retryable: false });
        snackbar.show({ message: "The school was accepted, but no school ID was returned.", type: "warning" });
      } else if (outcome.type === "failed") {
        const message = failureMessage(outcome.step, outcome.error);
        setFailure({ step: outcome.step, message, retryable: outcome.retryable });
        snackbar.show({
          message:
            outcome.step === STEP.SCHOOL
              ? "The school couldn't be created."
              : outcome.step === STEP.INVITE
                ? "The invitation couldn't be sent."
                : "The invitation was sent, but couldn't be linked to the school.",
          type: "error",
        });
      } else {
        snackbar.show({
          message: `Invitation sent to ${state.invite?.target || normalizeEmail(values.email)} and linked to the school.`,
          type: "success",
        });
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  const resetForm = () => {
    setValues(blankForm);
    setErrors({});
    setProgress(IDLE_PROGRESS);
    setFlow(EMPTY_FLOW);
    setFailure(null);
    setDuplicate(null);
    setUnavailable(false);
    setCopied(false);
    setStatus(null);
    setStatusError(null);
  };

  const refreshStatus = async () => {
    if (checkingStatus || !flow.linked) return;
    setCheckingStatus(true);
    setStatusError(null);
    try {
      setStatus(await checkInvitationStatus(workflowApi, flow));
    } catch (error) {
      setStatusError(
        isApiError(error) ? errorMessage(error, "inviteList") : serviceErrorMessage(error, "schoolLink"),
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyLink = async () => {
    if (!invite?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(invite.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: select the text so the admin can copy it manually.
      const field = document.getElementById("invite-link");
      field?.select();
    }
  };

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h2 className={ui.pageTitle}>Invite Schools</h2>
          <p className={ui.pageSubtitle}>
            Add school administrators to the SkoolJobs platform. They will
            receive an invitation link to create their account and start
            managing their school profile.
          </p>
        </div>
      </div>

      <form
        className={ui.card}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!sent) runSteps();
        }}
        aria-labelledby="invite-form-title"
      >
        <div className={ui.cardHead}>
          <div>
            <h3 id="invite-form-title" className={ui.cardTitle}>
              School Administrator Details
            </h3>
            <p className={ui.cardSubtitle}>
              Fields marked <span className={styles.requiredMark}>*</span> are required.
            </p>
          </div>
        </div>

        <div className={ui.cardBody}>
          <fieldset className={styles.fieldset} disabled={locked}>
            <legend className={styles.legend}>Administrator</legend>
            <div className={styles.grid}>
              <Input
                label="First Name *"
                name="firstName"
                value={values.firstName}
                onChange={(v) => update("firstName", v)}
                placeholder="e.g. Priya"
                autoComplete="off"
                maxLength={100}
                error={errors.firstName}
                required
                disabled={locked}
              />
              <Input
                label="Last Name *"
                name="lastName"
                value={values.lastName}
                onChange={(v) => update("lastName", v)}
                placeholder="e.g. Sharma"
                autoComplete="off"
                maxLength={100}
                error={errors.lastName}
                required
                disabled={locked}
              />
              <Input
                label="Email Address *"
                name="email"
                type="email"
                value={values.email}
                onChange={(v) => update("email", v)}
                placeholder="principal@school.in"
                autoComplete="off"
                error={errors.email}
                required
                disabled={locked}
              />
              <PhoneField
                label="Contact Number *"
                name="phone"
                countryCode={values.countryCode}
                number={values.phone}
                onCountryCodeChange={(v) => update("countryCode", v)}
                onNumberChange={(v) => update("phone", v)}
                error={errors.phone}
                disabled={locked}
              />
            </div>
          </fieldset>

          <fieldset className={styles.fieldset} disabled={locked}>
            <legend className={styles.legend}>School</legend>
            <div className={styles.grid}>
              <Input
                label="School Name *"
                name="schoolName"
                value={values.schoolName}
                onChange={(v) => update("schoolName", v)}
                placeholder="e.g. Green Valley Public School"
                autoComplete="off"
                maxLength={150}
                error={errors.schoolName}
                required
                disabled={locked}
              />
              <Input
                label="School Address"
                name="schoolAddress"
                value={values.schoolAddress}
                onChange={(v) => update("schoolAddress", v)}
                placeholder="Street, city, state, PIN"
                autoComplete="off"
                maxLength={300}
                supportingText="Optional"
                disabled={locked}
              />
            </div>
          </fieldset>

          <p className={styles.fieldNote}>
            The school is saved with its name, the email address and the contact
            number. The invitation is emailed to the administrator, who verifies
            that email address with a one-time code. School Address isn't saved
            yet: the school profile's address needs a PIN code, city, state and
            country.
          </p>
        </div>
      </form>

      <section className={ui.card} aria-labelledby="invite-link-title">
        <div className={ui.cardHead}>
          <div>
            <h3 id="invite-link-title" className={ui.cardTitle}>
              Invitation
            </h3>
            <p className={ui.cardSubtitle}>
              The administrator uses the emailed link to create their account,
              verifying their email address with a one-time code.
            </p>
          </div>
        </div>

        <div className={`${ui.cardBody} ${styles.linkBody}`}>
          {!inviteApiAvailable && !unavailable && (
            <div className={`${ui.notice} ${ui.noticeWarn}`} role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>Invitations can't be created from this login.</strong>{" "}
                You're signed in with the local demo admin account, which
                exists only in this browser and has no backend credentials.
                The invite service rejects it, so no invitation can be created
                or emailed. To invite a school, log out and sign in with a
                Platform Admin account registered in the SkoolJobs backend.
              </span>
            </div>
          )}

          {mockMode && !sent && (
            <div className={`${ui.notice} ${ui.noticeInfo}`} role="note">
              <Info size={16} aria-hidden="true" />
              <span>
                <strong>Mock API mode.</strong> Schools and links created here
                come from the in-browser mock. Nothing is saved on the server
                and no email is sent.
              </span>
            </div>
          )}

          {unavailable && (
            <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                The details are valid, but no school or invitation was created.
                The local demo admin account can't call the invite service.
                Log out and sign in with a backend Platform Admin account to
                create the invitation.
              </span>
            </div>
          )}

          {duplicate && (
            <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>An invitation to {duplicate.target} is already pending</strong>
                {formatDate(duplicate.expiresAt) ? ` (expires ${formatDate(duplicate.expiresAt)})` : ""}.
                No school or invitation was created, to avoid duplicates.
              </span>
            </div>
          )}

          {showProgress && (
            <ol className={styles.progress} aria-label="Invitation progress">
              <ProgressStep
                status={progress[STEP.SCHOOL]}
                title="Create school profile"
                detail={
                  flow.schoolProfileId
                    ? `School ID ${flow.schoolProfileId}`
                    : progress[STEP.SCHOOL] === "running"
                      ? "Creating the school…"
                      : progress[STEP.SCHOOL] === "accepted"
                        ? "Request accepted, but no school ID was returned"
                        : "Not created"
                }
              />
              <ProgressStep
                status={progress[STEP.INVITE]}
                title="Send invitation"
                detail={
                  invite
                    ? `Sent to ${invite.target || normalizeEmail(values.email)}`
                    : progress[STEP.INVITE] === "running"
                      ? "Sending the invitation…"
                      : progress[STEP.INVITE] === "failed" || failure?.kind === "noSchoolId"
                        ? "Not sent"
                        : "Waiting for the school"
                }
              />
              <ProgressStep
                status={progress[STEP.LINK]}
                title="Link invitation to school"
                detail={
                  flow.linked
                    ? "Linked: whoever accepts this invitation becomes the school's admin"
                    : progress[STEP.LINK] === "running"
                      ? "Linking… (a new school can take a few seconds to be saved)"
                      : progress[STEP.LINK] === "failed"
                        ? "Not linked"
                        : "Waiting for the invitation"
                }
              />
            </ol>
          )}

          {failure?.kind === "noSchoolId" && (
            <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>The school request was accepted, but no school ID was returned.</strong>{" "}
                {failure.message}
              </span>
            </div>
          )}

          {failure && failure.kind !== "noSchoolId" && !linkFailure && (
            <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>
                  {failure.step === STEP.SCHOOL
                    ? "The school couldn't be created, so no invitation was sent."
                    : "The school was created, but the invitation couldn't be sent."}
                </strong>{" "}
                {failure.message}
              </span>
            </div>
          )}

          {sent ? (
            <>
              {mockMode && (
                <div className={`${ui.notice} ${ui.noticeWarn}`} role="note">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>
                    <strong>Test invitation (mock mode).</strong> No email was
                    sent and the link below only works while the app runs with
                    the mock API.
                  </span>
                </div>
              )}

              <div className={`${ui.notice} ${ui.noticeSuccess}`} role="status">
                <Check size={16} aria-hidden="true" />
                <span>
                  <strong>{mockMode ? "Test invitation created" : "Invitation sent successfully"}</strong>{" "}
                  for <strong>{values.schoolName.trim()}</strong> to{" "}
                  <strong>{invite.target || normalizeEmail(values.email)}</strong>
                  {formatDate(invite.expiresAt) ? `. Expires ${formatDate(invite.expiresAt)}` : ""}.
                </span>
              </div>

              {flow.linked && (
                <div className={`${ui.notice} ${ui.noticeSuccess}`} role="status">
                  <Link2 size={16} aria-hidden="true" />
                  <span>
                    <strong>Linked to the school.</strong> When the administrator
                    accepts the invitation and creates their account, they become
                    the admin of {values.schoolName.trim()} and can manage its profile.
                  </span>
                </div>
              )}

              {!flow.linked && running && (
                <div className={`${ui.notice} ${ui.noticeInfo}`} role="status">
                  <Loader2 size={16} aria-hidden="true" className={styles.spin} />
                  <span>
                    <strong>Linking the invitation to the school…</strong> A new
                    school can take a few seconds to be saved.
                  </span>
                </div>
              )}

              {linkFailure && (
                <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
                  <Link2Off size={16} aria-hidden="true" />
                  <span>
                    <strong>The invitation was sent, but isn't linked to the school.</strong>{" "}
                    {linkFailure.message} Until it is linked, the administrator won't
                    get this school after signing up.{" "}
                    {linkFailure.retryable
                      ? "Retry linking below."
                      : "Retrying won't fix this; check with the backend team."}{" "}
                    School <code>{flow.schoolProfileId}</code>, invitation{" "}
                    <code>{invite.inviteId || "not returned"}</code>.
                  </span>
                </div>
              )}

              {invite.inviteLink ? (
                <div className={styles.linkRow}>
                  <div className={styles.linkField}>
                    <Input
                      id="invite-link"
                      label={mockMode ? "Test invitation URL (mock)" : "Invitation URL"}
                      value={invite.inviteLink}
                      readOnly
                    />
                  </div>
                  <Button variant="filled" onClick={copyLink}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy Invitation Link"}
                  </Button>
                </div>
              ) : (
                <div className={`${ui.notice} ${ui.noticeInfo}`} role="note">
                  <Info size={16} aria-hidden="true" />
                  <span>
                    The server didn't return a link to show here. Check the
                    invite list or the invite service for its delivery status.
                  </span>
                </div>
              )}

              {flow.linked && (status || statusError) && (
                <ol className={styles.progress} aria-label="Invitation status" aria-live="polite">
                  {status && (
                    <>
                      <ProgressStep
                        status={status.inviteStatus === "ACCEPTED" ? "done" : status.inviteStatus ? "idle" : "failed"}
                        title="Invitation accepted"
                        detail={
                          INVITE_STATUS_TEXT[status.inviteStatus] ??
                          (status.inviteStatus
                            ? `Status: ${status.inviteStatus}.`
                            : "Not found in your invitations.")
                        }
                      />
                      <ProgressStep
                        status={status.adminAssigned ? "done" : "idle"}
                        title="School admin assigned"
                        detail={
                          status.adminAssigned
                            ? "The administrator now manages this school."
                            : status.inviteStatus === "ACCEPTED"
                              ? "Being assigned; this can take a few seconds. Check again shortly."
                              : "After the invitation is accepted."
                        }
                      />
                    </>
                  )}
                  {statusError && (
                    <ProgressStep status="failed" title="Status not available" detail={statusError} />
                  )}
                </ol>
              )}

              <div className={styles.linkActions}>
                {linkFailure?.retryable && (
                  <Button variant="filled" onClick={runSteps} disabled={running}>
                    {running ? <Loader2 size={16} className={styles.spin} /> : <RotateCw size={16} />}
                    {running ? runningLabel : "Retry Linking"}
                  </Button>
                )}
                {flow.linked && (
                  <Button variant="outlined" onClick={refreshStatus} disabled={checkingStatus}>
                    {checkingStatus ? <Loader2 size={16} className={styles.spin} /> : <RotateCw size={16} />}
                    {checkingStatus ? "Checking…" : "Check Status"}
                  </Button>
                )}
                <Button variant="outlined" onClick={resetForm} disabled={running}>
                  Invite another school
                </Button>
              </div>
            </>
          ) : (
            <>
              {!showProgress && (
                <>
                  <div className={styles.linkEmpty}>
                    <span className={ui.emptyIcon}><Link2 size={20} /></span>
                    <div>
                      <p className={ui.emptyTitle}>No invitation yet</p>
                      <p className={styles.linkEmptyText}>
                        Fill in the details above, then send the invitation.
                        The link appears here to copy once it's created.
                      </p>
                    </div>
                  </div>
                  <ol className={styles.steps}>
                    <li>Enter the administrator and school details.</li>
                    <li>Send the invitation: the school is created first, then the invitation, which is then linked to the school.</li>
                    <li>
                      {mockMode
                        ? "Mock mode: nothing is emailed. Copy the test link yourself."
                        : "The invite service emails the link to the school administrator."}
                    </li>
                    <li>They open it, verify their email with a one-time code and create their account.</li>
                  </ol>
                </>
              )}

              {flow.schoolProfileId && failure?.step === STEP.INVITE && (
                <p className={styles.fieldNote}>
                  {failure.retryable
                    ? "Retrying reuses the school created above. Starting over leaves that school without an invitation."
                    : "Retrying won't fix this error. Starting over leaves the school created above without an invitation."}
                </p>
              )}

              <div className={styles.linkActions}>
                {!flow.schoolProfileId && failure?.step !== STEP.SCHOOL && (
                  <Button variant="filled" onClick={runSteps} disabled={running}>
                    {running ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
                    {running ? runningLabel : "Send Invitation"}
                  </Button>
                )}
                {failure?.step === STEP.SCHOOL && failure.retryable && (
                  <Button variant="filled" onClick={runSteps} disabled={running}>
                    {running ? <Loader2 size={16} className={styles.spin} /> : <RotateCw size={16} />}
                    {running ? runningLabel : "Retry Creating School"}
                  </Button>
                )}
                {flow.schoolProfileId && (running || failure?.retryable) && (
                  <Button variant="filled" onClick={runSteps} disabled={running}>
                    {running ? <Loader2 size={16} className={styles.spin} /> : <RotateCw size={16} />}
                    {running ? runningLabel : "Retry Invitation"}
                  </Button>
                )}
                <Button variant="text" onClick={resetForm} disabled={running}>
                  {showProgress ? "Start over" : "Clear form"}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminInviteSchools;
