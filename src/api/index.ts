import { config } from "../config/env";
import { httpAuthApi, type AuthApi } from "./authApi";
import { mockAuthApi } from "./mockAuthApi";

// The mock issues unsigned tokens: never in a production build, whatever the runtime config says.
export const mockApiEnabled = import.meta.env.DEV && config.useMockApi;

export const authApi: AuthApi = mockApiEnabled ? mockAuthApi : httpAuthApi;

export * from "./types";
export { ApiError, isApiError, statusOf } from "./errors";
export { configureAuthBridge, serviceHttp } from "./httpClient";
export { pinApi } from "./pinApi";
export type { DeviceCredentials, PinSettings, PinStatus, TrustedDevice } from "./pinApi";
export { accountApi } from "./accountApi";
