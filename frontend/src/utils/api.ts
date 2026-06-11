import axios from "axios";
import type {
  InferenceResponse,
  ExperimentRun,
  ModelVersion,
  HealthStatus,
} from "../types";

const BASE_URL = "/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.message ??
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export async function predictImage(
  file: File,
  explain: boolean = true
): Promise<InferenceResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<InferenceResponse>(
    `/predict?explain=${explain}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchExperiments(): Promise<ExperimentRun[]> {
  const { data } = await api.get<ExperimentRun[]>("/experiments");
  return data;
}

export async function fetchModelRegistry(): Promise<ModelVersion[]> {
  const { data } = await api.get<ModelVersion[]>("/model-registry");
  return data;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>("/health");
  return data;
}

export async function fetchLabels(): Promise<string[]> {
  const { data } = await api.get<{ labels: string[] }>("/labels");
  return data.labels;
}