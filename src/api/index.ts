import { config } from "../config/env";
import { httpAuthApi, type AuthApi } from "./authApi";
import { mockAuthApi } from "./mockAuthApi";

export const authApi: AuthApi = config.useMockApi ? mockAuthApi : httpAuthApi;

export * from "./types";
export { ApiError, isApiError, statusOf } from "./errors";
export { configureAuthBridge, serviceHttp } from "./httpClient";
