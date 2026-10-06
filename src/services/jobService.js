import { Configuration, JobApi } from "@skooljobs/job-api";

const BASE_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:8085"
        : "http://dev.app.skooljobs.com";

const configuration = new Configuration({
    basePath: BASE_URL,
});

const jobApi = new JobApi(configuration);

export const createJob = async (payload) => {
    return jobApi.createJob(payload);
};
