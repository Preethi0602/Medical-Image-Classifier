import { useQuery } from "@tanstack/react-query";
import { fetchExperiments, fetchModelRegistry } from "../utils/api";
import type { ExperimentRun, ModelVersion } from "../types";

export function useExperiments() {
  const {
    data: runs = [],
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useQuery<ExperimentRun[]>({
    queryKey: ["experiments"],
    queryFn: async () => {
      try {
        return await fetchExperiments();
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: false,
  });

  const bestAuc = runs.length
    ? Math.max(...runs.map((r) => r.mean_auc))
    : 0;

  const latestRun = runs.length ? runs[0] : null;
  const finishedRuns = runs.filter((r) => r.status === "FINISHED");

  return {
    runs,
    runsLoading,
    runsError,
    refetchRuns,
    bestAuc,
    latestRun,
    finishedRuns,
  };
}

export function useModelRegistry() {
  const {
    data: versions = [],
    isLoading: versionsLoading,
    isError: versionsError,
    refetch: refetchVersions,
  } = useQuery<ModelVersion[]>({
    queryKey: ["model-registry"],
    queryFn: async () => {
      try {
        return await fetchModelRegistry();
      } catch {
        return [];
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const productionModel = versions.find((v) => v.stage === "Production");
  const stagingModel = versions.find((v) => v.stage === "Staging");

  return {
    versions,
    versionsLoading,
    versionsError,
    refetchVersions,
    productionModel,
    stagingModel,
  };
}