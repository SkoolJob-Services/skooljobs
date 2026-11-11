import type { TenantInfoResponse } from "../../api";

/** Ways a one-time code (or an invite) can be sent. */
export type Channel = "EMAIL" | "WHATSAPP" | "SMS";

/** Display order everywhere. */
export const CHANNELS: Channel[] = ["EMAIL", "WHATSAPP", "SMS"];

export const CHANNEL_LABEL: Record<Channel, string> = { EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS" };

/** Channels switched on for this tenant, per flow (system-configuration, Tenants row → otpChannels). */
export interface TenantChannels {
  login: Channel[];
  signup: Channel[];
  invite: Channel[];
}

/** signup-api 0.0.1-dev.2 adds otpChannels; older clients' types lack it. */
type WithChannels = { otpChannels?: { login?: string[]; signup?: string[]; invite?: string[] } | null };

/** A missing list (older signup service) means every channel, as before. */
function pick(list: string[] | undefined): Channel[] {
  if (!list) return [...CHANNELS];
  const wanted = list.map((c) => c.trim().toUpperCase());
  return CHANNELS.filter((c) => wanted.includes(c));
}

export function channelsOf(tenant: TenantInfoResponse | null | undefined): TenantChannels {
  const settings = (tenant as WithChannels | null | undefined)?.otpChannels ?? undefined;
  return { login: pick(settings?.login), signup: pick(settings?.signup), invite: pick(settings?.invite) };
}

/** The login request flags for one channel. */
export function loginChannelFlags(channel: Channel) {
  return {
    isEmailOtpRequested: channel === "EMAIL",
    isPhoneOtpRequested: channel === "SMS",
    isWhatUpNoOtpRequested: channel === "WHATSAPP",
  };
}

/** Channel to start the login screen on: the one used last, else one that fits the identifier, else the first. */
export function initialLoginChannel(enabled: Channel[], identifier?: string, previous?: Channel): Channel | undefined {
  if (previous && enabled.includes(previous)) return previous;
  if (identifier) {
    const fits: Channel[] = identifier.includes("@") ? ["EMAIL"] : ["WHATSAPP", "SMS"];
    const match = fits.find((c) => enabled.includes(c));
    if (match) return match;
  }
  return enabled[0];
}
