import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { errorMessage, serviceErrorMessage } from "./errorMessages";

describe("errorMessage", () => {
  it("maps a status to a message for the screen it happened on", () => {
    expect(errorMessage(new ApiError(404, "USER_NOT_FOUND", "x"), "loginRequest")).toMatch(/no account found/i);
    expect(errorMessage(new ApiError(410, "OTP_EXPIRED", "x"), "loginVerify")).toMatch(/expired/i);
  });

  it("prefers a known backend error code over the status", () => {
    expect(errorMessage(new ApiError(404, "SIGNUP_SESSION_NOT_FOUND", "x"), "loginVerify")).toMatch(/signup session has expired/i);
  });

  it("shows the server message for 400 errors", () => {
    expect(errorMessage(new ApiError(400, "BAD_REQUEST", "Phone is invalid"), "signupStart")).toBe("Phone is invalid");
  });

  it("uses a generic message for server and unknown errors", () => {
    expect(errorMessage(new ApiError(500, "INTERNAL", "boom"), "signupStart")).toMatch(/on our side/i);
    expect(errorMessage(new Error("boom"), "signupStart")).toBe("Something went wrong. Please try again.");
  });

  it("explains network failures", () => {
    expect(errorMessage(new ApiError(0, "NETWORK_ERROR", "x"), "tenant")).toMatch(/unable to reach the server/i);
  });
});

describe("serviceErrorMessage", () => {
  it("reads the service's ErrorResponse from an axios-style error", () => {
    const error = { response: { status: 400, data: { code: "SCH_001", message: "School name is required" } } };
    expect(serviceErrorMessage(error, "schoolCreate")).toBe("School name is required");
  });

  it("maps statuses for the screen it happened on", () => {
    expect(serviceErrorMessage({ response: { status: 403, data: {} } }, "schoolCreate")).toMatch(/permission/i);
    expect(serviceErrorMessage({ response: { status: 503 } }, "schoolCreate")).toMatch(/on our side/i);
  });

  it("explains failures without a response as network errors", () => {
    expect(serviceErrorMessage(new Error("Network Error"), "schoolCreate")).toMatch(/unable to reach the server/i);
  });

  it("passes ApiErrors through unchanged", () => {
    expect(serviceErrorMessage(new ApiError(404, "USER_NOT_FOUND", "x"), "loginRequest")).toMatch(/no account found/i);
  });

  it("explains each SchoolProfile conflict of linking an invite to a school", () => {
    const conflict = (code: string) => ({ response: { status: 409, data: { code, message: code } } });
    expect(serviceErrorMessage(conflict("SCH_007"), "schoolLink")).toMatch(/already has a school admin/i);
    expect(serviceErrorMessage(conflict("SCH_008"), "schoolLink")).toMatch(/linked to another school/i);
    expect(serviceErrorMessage(conflict("SCH_009"), "schoolLink")).toMatch(/already manages another school/i);
  });

  it("maps link statuses: not stored yet, not allowed, session ended", () => {
    const status = (code: number) => ({ response: { status: code, data: {} } });
    expect(serviceErrorMessage(status(404), "schoolLink")).toMatch(/may still be being saved/i);
    expect(serviceErrorMessage(status(403), "schoolLink")).toMatch(/permission/i);
    expect(serviceErrorMessage(status(401), "schoolLink")).toMatch(/session has ended/i);
  });
});
