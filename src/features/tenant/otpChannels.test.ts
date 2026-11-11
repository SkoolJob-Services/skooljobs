import { describe, expect, it } from "vitest";
import type { TenantInfoResponse } from "../../api";
import { channelsOf, initialLoginChannel, loginChannelFlags } from "./otpChannels";

const tenant = (otpChannels?: unknown) => ({ tenantId: "KALUAFARMS", otpChannels }) as unknown as TenantInfoResponse;

describe("otpChannels", () => {
  it("offers every channel when the service sends no setting", () => {
    expect(channelsOf(tenant()).login).toEqual(["EMAIL", "WHATSAPP", "SMS"]);
    expect(channelsOf(null).invite).toEqual(["EMAIL", "WHATSAPP", "SMS"]);
    expect(channelsOf(tenant({ login: ["EMAIL"] })).signup).toEqual(["EMAIL", "WHATSAPP", "SMS"]);
  });

  it("keeps only the channels switched on, in display order", () => {
    const channels = channelsOf(tenant({ login: ["SMS", "email", "whatsapp"], signup: ["EMAIL", "WHATSAPP"], invite: [] }));
    expect(channels.login).toEqual(["EMAIL", "WHATSAPP", "SMS"]);
    expect(channels.signup).toEqual(["EMAIL", "WHATSAPP"]);
    expect(channels.invite).toEqual([]);
  });

  it("sets exactly one login flag", () => {
    expect(loginChannelFlags("WHATSAPP")).toEqual({ isEmailOtpRequested: false, isPhoneOtpRequested: false, isWhatUpNoOtpRequested: true });
    expect(loginChannelFlags("SMS").isPhoneOtpRequested).toBe(true);
  });

  it("starts on the last channel, else one that fits what was typed", () => {
    expect(initialLoginChannel(["EMAIL", "WHATSAPP"], "+919811238048")).toBe("WHATSAPP");
    expect(initialLoginChannel(["EMAIL", "SMS"], "+919811238048")).toBe("SMS");
    expect(initialLoginChannel(["EMAIL", "WHATSAPP"], "a@b.com", "WHATSAPP")).toBe("WHATSAPP");
    expect(initialLoginChannel(["EMAIL", "WHATSAPP"], undefined, "SMS")).toBe("EMAIL");
    expect(initialLoginChannel([], "a@b.com")).toBeUndefined();
  });
});
