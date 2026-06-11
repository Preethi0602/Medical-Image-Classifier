import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Activity, Upload, FlaskConical, Box } from "lucide-react";
import { UploadZone } from "./components/Upload/UploadZone";
import { ResultsPanel } from "./components/Results/ResultsPanel";
import { ExperimentDashboard } from "./components/Dashboard/ExperimentDashboard";
import { ModelRegistry } from "./components/Registry/ModelRegistry";
import { useInference } from "./hooks/useInference";
import type { Tab } from "./types";

const queryClient = new QueryClient();

const TABS: { id: Tab; label: string; icon: typeof Upload }[] = [
  { id: "inference",   label: "Inference",   icon: Upload       },
  { id: "experiments", label: "Experiments", icon: FlaskConical },
  { id: "registry",    label: "Registry",    icon: Box          },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>("inference");
  const { result, previewUrl, state, error, run, reset } =
    useInference();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200
                         sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4
                        flex items-center justify-between">

          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">
                Medical Image Disease Classifier
              </h1>
              <p className="text-xs text-gray-500">
                ResNet-50 · 14 disease classes · Grad-CAM
              </p>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md
                  text-sm font-medium transition-colors
                  ${tab === id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Inference tab */}
        {tab === "inference" && (
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between
                              mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Upload X-ray
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Upload a chest X-ray to get disease predictions
                    and Grad-CAM heatmaps
                  </p>
                </div>
                {state === "success" && (
                  <button
                    onClick={reset}
                    className="btn-secondary text-xs"
                  >
                    Upload another
                  </button>
                )}
              </div>
              <UploadZone
                state={state}
                error={error}
                onFile={run}
                onReset={reset}
              />
            </div>

            {/* Results */}
            {result && previewUrl && state === "success" && (
              <div className="card p-6">
                <ResultsPanel
                  result={result}
                  previewUrl={previewUrl}
                />
              </div>
            )}
          </div>
        )}

        {/* Experiments tab */}
        {tab === "experiments" && <ExperimentDashboard />}

        {/* Registry tab */}
        {tab === "registry" && <ModelRegistry />}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-6 py-6
                         border-t border-gray-200 mt-8">
        <p className="text-xs text-center text-gray-400">
          For research purposes only. Not intended for clinical
          diagnosis or medical decision-making.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}