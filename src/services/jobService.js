import { Configuration, JobApi } from "@skooljobs/job-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.job,
});

const jobApi = new JobApi(configuration, undefined, serviceHttp);

export const createJob = async (payload) => {
    return jobApi.createJob(payload);
};
