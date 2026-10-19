import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { errorMessage } from "./errorMessages";

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
