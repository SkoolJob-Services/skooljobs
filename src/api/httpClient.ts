import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { Configuration } from "@app/signup-api";
import { config } from "../config/env";
import { ApiError } from "./errors";
import type { ErrorResponse } from "./types";

/**
 * Shared axios instance and Configuration for the generated @app/signup-api
 * client. Adds the headers the spec doesn't declare (X-Client-Id,
 * X-Tenant-Code), the bearer token, and turns failures into ApiError.
 */

let getAccessToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

/** Called once by AuthProvider so the client can read the token and report 401s. */
export function configureAuthBridge(bridge: {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
}): void {
  getAccessToken = bridge.getAccessToken;
  onUnauthorized = bridge.onUnauthorized;
}

export const http: AxiosInstance = axios.create({
  headers: { Accept: "application/json" },
});

function addPlatformHeaders(request: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (config.clientId) request.headers.set("X-Client-Id", config.clientId);
  if (config.tenantCode) request.headers.set("X-Tenant-Code", config.tenantCode);
  const token = getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
}

http.interceptors.request.use(addPlatformHeaders);

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (!(error instanceof AxiosError) || !error.response) {
      return Promise.reject(
        new ApiError(0, "NETWORK_ERROR", "Unable to reach the server. Check your connection and try again."),
      );
    }
    const { status, data, statusText } = error.response;
    const body: Partial<ErrorResponse> = data && typeof data === "object" ? (data as Partial<ErrorResponse>) : {};
    // Only authenticated calls carry a token; a 401 there means the session ended.
    if (status === 401 && error.config?.headers?.Authorization) onUnauthorized();
    return Promise.reject(
      new ApiError(status, body.code ?? `HTTP_${status}`, body.message ?? (statusText || "Request failed"), data),
    );
  },
);

/** Generated clients read basePath from here instead of the spec's server URL. */
export const apiConfiguration = new Configuration({ basePath: config.apiBaseUrl });

/**
 * Axios instance for the SkoolJobs service clients (job, school, teacher,
 * application — src/services). Same headers and bearer token as the signup
 * client, but errors stay plain AxiosErrors because those callers read
 * error.response. A 401 on an authenticated call still ends the session.
 */
export const serviceHttp: AxiosInstance = axios.create({
  headers: { Accept: "application/json" },
});

serviceHttp.interceptors.request.use(addPlatformHeaders);
serviceHttp.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401 && error.config?.headers?.Authorization) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);
