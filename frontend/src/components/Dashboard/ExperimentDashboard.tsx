import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from "recharts";
  import { RefreshCw, TrendingUp, FlaskConical, Award } from "lucide-react";
  import { useExperiments } from "../../hooks/useExperiments";
  
  export function ExperimentDashboard() {
    const {
      runs,
      runsLoading,
      runsError,
      refetchRuns,
      bestAuc,
      finishedRuns,
    } = useExperiments();
  
    const chartData = runs
      .slice()
      .reverse()
      .map((r, i) => ({
        run: `Run ${i + 1}`,
        auc: parseFloat(r.mean_auc.toFixed(4)),
        val_loss: parseFloat(r.val_loss.toFixed(4)),
        train_loss: parseFloat(r.train_loss.toFixed(4)),
      }));
  
      if (runsLoading && runs.length === 0) {
      return (
        <div className="flex items-center justify-center h-64
                        text-gray-400">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <p className="text-sm">Loading experiments...</p>
          </div>
        </div>
      );
    }
  
    if (runsError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <p className="text-red-500 font-medium">
              Failed to load experiments
            </p>
            <p className="text-sm text-gray-400">
              Make sure MLflow is running on port 5000
            </p>
            <button
              onClick={() => refetchRuns()}
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
  
        {/* ── Metric cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total runs",
              value: runs.length,
              icon: FlaskConical,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Best AUC",
              value: bestAuc.toFixed(4),
              icon: Award,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Finished",
              value: finishedRuns.length,
              icon: TrendingUp,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              label: "Gate threshold",
              value: "0.92",
              icon: Award,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="card p-4 flex items-start gap-3"
            >
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium
                              uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
  
        {/* ── AUC chart ── */}
        {chartData.length > 0 ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">
                Metrics across runs
              </h3>
              <button
                onClick={() => refetchRuns()}
                className="text-gray-400 hover:text-gray-600
                           transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="run"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0.7, 1.0]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="auc"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Mean AUC"
                />
                <Line
                  type="monotone"
                  dataKey="val_loss"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Val Loss"
                />
                <Line
                  type="monotone"
                  dataKey="train_loss"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Train Loss"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card p-10 text-center text-gray-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-3
                                      opacity-40" />
            <p className="font-medium">No experiments yet</p>
            <p className="text-sm mt-1">
              Run training to see metrics here
            </p>
          </div>
        )}
  
        {/* ── Run table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100
                          flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              Experiment runs
            </h3>
            <span className="badge-gray">{runs.length} runs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs
                                uppercase tracking-wide">
                <tr>
                  {[
                    "Run",
                    "Mean AUC",
                    "Train Loss",
                    "Val Loss",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.run_id}
                    className="border-t border-gray-100
                               hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs
                                   text-gray-600">
                      {run.run_name}
                    </td>
                    <td className="px-5 py-3 font-semibold
                                   text-blue-600">
                      {run.mean_auc.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {run.train_loss.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {run.val_loss.toFixed(4)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          run.status === "FINISHED"
                            ? "badge-green"
                            : "badge-amber"
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center
                                 text-gray-400 text-sm"
                    >
                      No runs yet. Start training to populate this table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }