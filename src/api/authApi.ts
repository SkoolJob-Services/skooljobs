import {
  AuthenticationApi,
  CreateInviteRequestChannelEnum,
  InviteApi,
  ListInvitesStatusEnum,
  SignupApi,
  TenantApi,
} from "@app/signup-api";
import { apiConfiguration, http } from "./httpClient";
import { newFlowSessionId, resolveSessionId, SESSION_HEADER } from "./sessionId";
import type {
  AcceptInviteRequest,
  CommandAcceptedResponse,
  CompleteSignupRequest,
  InviteDetailsResponse,
  InviteResponse,
  InviteStatus,
  NewInvite,
  LoginOtpAcceptedResponse,
  LoginOtpRequest,
  LoginOtpVerifyRequest,
  LoginResponse,
  OtpFlowStarted,
  SignupSessionRequest,
  SuccessResponse,
  TenantInfoResponse,
} from "./types";

/** Everything the UI needs from the Signup and Authentication API. */
export interface AuthApi {
  getCurrentTenant(): Promise<TenantInfoResponse>;
  createSignupSession(body: SignupSessionRequest): Promise<OtpFlowStarted<CommandAcceptedResponse>>;
  completeSignup(body: CompleteSignupRequest, sessionId: string): Promise<CommandAcceptedResponse>;
  requestLoginOtp(body: LoginOtpRequest): Promise<OtpFlowStarted<LoginOtpAcceptedResponse>>;
  verifyLoginOtp(body: LoginOtpVerifyRequest, sessionId: string): Promise<LoginResponse>;
  logout(): Promise<SuccessResponse>;
  getInviteDetails(inviteToken: string): Promise<InviteDetailsResponse>;
  acceptInvite(inviteToken: string, body: AcceptInviteRequest): Promise<OtpFlowStarted<CommandAcceptedResponse>>;
  /** Invite someone (admin/member, logged in). */
  createInvite(body: NewInvite): Promise<InviteResponse>;
  /** Invites sent in this organisation, optionally filtered by status. */
  listInvites(status?: InviteStatus): Promise<InviteResponse[]>;
  resendInvite(inviteId: string): Promise<InviteResponse>;
  revokeInvite(inviteId: string): Promise<SuccessResponse>;
}

// The package pins its own axios version. package.json "overrides" dedupes it to the
// app's axios; until then the two copies' types differ even though they are
// runtime-compatible, so the shared instance is passed through the package's own type.
type GeneratedAxios = ConstructorParameters<typeof SignupApi>[2];
const client = http as unknown as GeneratedAxios;

// Generated clients from @app/signup-api, sharing one axios instance.
const signupApi = new SignupApi(apiConfiguration, undefined, client);
const authenticationApi = new AuthenticationApi(apiConfiguration, undefined, client);
const tenantApi = new TenantApi(apiConfiguration, undefined, client);
const inviteApi = new InviteApi(apiConfiguration, undefined, client);

/**
 * The spec doesn't declare X-Session-Id on the calls that start an OTP flow,
 * so the generated methods have no parameter for it. Send the client-made id
 * as an extra header and prefer one the server returns (see sessionId.ts).
 */
function startFlowOptions(sessionId: string) {
  return { headers: { [SESSION_HEADER]: sessionId } };
}

function responseHeaders(headers: unknown): Headers {
  const result = new Headers();
  if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (typeof value === "string") result.set(key, value);
    }
  }
  return result;
}

export const httpAuthApi: AuthApi = {
  async getCurrentTenant() {
    return (await tenantApi.getCurrentTenant()).data;
  },

  async createSignupSession(body) {
    const sent = newFlowSessionId();
    const response = await signupApi.createSignupSession(body, startFlowOptions(sent));
    return { sessionId: resolveSessionId(responseHeaders(response.headers), sent), result: response.data };
  },

  async completeSignup(body, sessionId) {
    return (await signupApi.completeSignup(sessionId, body)).data;
  },

  async requestLoginOtp(body) {
    const sent = newFlowSessionId();
    const response = await authenticationApi.requestLoginOtp(body, startFlowOptions(sent));
    return { sessionId: resolveSessionId(responseHeaders(response.headers), sent), result: response.data };
  },

  async verifyLoginOtp(body, sessionId) {
    return (await authenticationApi.verifyLoginOtp(sessionId, body)).data;
  },

  async logout() {
    return (await authenticationApi.logout()).data;
  },

  async getInviteDetails(inviteToken) {
    return (await inviteApi.getInviteDetails(inviteToken)).data;
  },

  async acceptInvite(inviteToken, body) {
    const sent = newFlowSessionId();
    const response = await inviteApi.acceptInvite(inviteToken, body, startFlowOptions(sent));
    return { sessionId: resolveSessionId(responseHeaders(response.headers), sent), result: response.data };
  },

  async createInvite(body) {
    return (await inviteApi.createInvite({ ...body, channel: body.channel as CreateInviteRequestChannelEnum })).data;
  },

  async listInvites(status) {
    return (await inviteApi.listInvites(status as ListInvitesStatusEnum | undefined)).data;
  },

  async resendInvite(inviteId) {
    return (await inviteApi.resendInvite(inviteId)).data;
  },

  async revokeInvite(inviteId) {
    return (await inviteApi.revokeInvite(inviteId)).data;
  },
};
