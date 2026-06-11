import { RefreshCw, Box, CheckCircle, Clock, XCircle } from "lucide-react";
import { useModelRegistry } from "../../hooks/useExperiments";

function StageIcon({ stage }: { stage: string }) {
  if (stage === "Production") {
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
  if (stage === "Staging") {
    return <Clock className="w-4 h-4 text-blue-500" />;
  }
  return <XCircle className="w-4 h-4 text-gray-400" />;
}

function stageBadge(stage: string): string {
  if (stage === "Production") return "badge-green";
  if (stage === "Staging") return "badge-blue";
  return "badge-gray";
}

export function ModelRegistry() {
  const {
    versions,
    versionsLoading,
    versionsError,
    refetchVersions,
    productionModel,
    stagingModel,
  } = useModelRegistry();

  if (versionsLoading && versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64
                      text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <p className="text-sm">Loading model registry...</p>
        </div>
      </div>
    );
  }

  if (versionsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-red-500 font-medium">
            Failed to load model registry
          </p>
          <p className="text-sm text-gray-400">
            Make sure MLflow is running on port 5000
          </p>
          <button
            onClick={() => refetchVersions()}
            className="btn-secondary mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Active models ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Production */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium
                          uppercase tracking-wide">
              Production
            </p>
            <span className="badge-green">Live</span>
          </div>
          {productionModel ? (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    ChestXRayClassifier
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    v{productionModel.version}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100
                              space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span className="font-mono text-gray-700">
                    v{productionModel.version}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Run ID</span>
                  <span className="font-mono text-gray-700 text-xs">
                    {productionModel.run_id.slice(0, 10)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={stageBadge(productionModel.stage)}>
                    {productionModel.stage}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-gray-400">
              <Box className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No production model yet</p>
            </div>
          )}
        </div>

        {/* Staging */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium
                          uppercase tracking-wide">
              Staging
            </p>
            <span className="badge-blue">Candidate</span>
          </div>
          {stagingModel ? (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    ChestXRayClassifier
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    v{stagingModel.version}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100
                              space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span className="font-mono text-gray-700">
                    v{stagingModel.version}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Run ID</span>
                  <span className="font-mono text-gray-700 text-xs">
                    {stagingModel.run_id.slice(0, 10)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={stageBadge(stagingModel.stage)}>
                    {stagingModel.stage}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-gray-400">
              <Box className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No staging model yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── All versions table ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100
                        flex items-center justify-between">
          <h3 className="font-medium text-gray-700">
            All versions
          </h3>
          <button
            onClick={() => refetchVersions()}
            className="text-gray-400 hover:text-gray-600
                       transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {versions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs
                                uppercase tracking-wide">
                <tr>
                  {["Version", "Stage", "Run ID", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr
                    key={v.version}
                    className="border-t border-gray-100
                               hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StageIcon stage={v.stage} />
                        <span className="font-mono text-gray-700">
                          v{v.version}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={stageBadge(v.stage)}>
                        {v.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs
                                   text-gray-500">
                      {v.run_id.slice(0, 12)}...
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          v.status === "READY"
                            ? "badge-green"
                            : "badge-gray"
                        }
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <Box className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No registered models</p>
            <p className="text-sm mt-1">
              Models appear here after training passes the eval gate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}