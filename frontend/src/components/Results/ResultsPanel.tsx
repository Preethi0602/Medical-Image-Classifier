import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import type { InferenceResponse } from "../../types";

interface Props {
  result: InferenceResponse;
  previewUrl: string;
}

export function ResultsPanel({ result, previewUrl }: Props) {
  const [activeLabel, setActiveLabel] = useState<string | null>(
    result.top_diagnosis
  );
  const [showOriginal, setShowOriginal] = useState(false);

  const top5 = result.predictions.slice(0, 5);
  const hasHeatmap =
    activeLabel !== null &&
    result.gradcam_maps[activeLabel] !== undefined;

  const displayImage =
    showOriginal || !hasHeatmap
      ? previewUrl
      : result.gradcam_maps[activeLabel!];

  const getRiskColor = (prob: number) => {
    if (prob > 0.7) return "bg-red-400";
    if (prob > 0.4) return "bg-amber-400";
    return "bg-blue-400";
  };

  const getRiskBadge = (prob: number) => {
    if (prob > 0.7) return "badge-red";
    if (prob > 0.4) return "badge-amber";
    return "badge-blue";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* ── Left: image + heatmap ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800">
            X-ray Analysis
          </h3>
          {hasHeatmap && (
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="flex items-center gap-1.5 text-xs
                         text-gray-500 hover:text-gray-700
                         transition-colors"
            >
              {showOriginal ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              {showOriginal ? "Show heatmap" : "Show original"}
            </button>
          )}
        </div>

        {/* Image display */}
        <div className="relative rounded-xl overflow-hidden
                        bg-black aspect-square">
          <img
            src={displayImage}
            alt={
              hasHeatmap && !showOriginal
                ? `Grad-CAM heatmap for ${activeLabel}`
                : "Uploaded chest X-ray"
            }
            className="w-full h-full object-contain"
          />
          {hasHeatmap && !showOriginal && (
            <div className="absolute top-3 left-3 bg-black/60
                            text-white text-xs px-2.5 py-1
                            rounded-full">
              Grad-CAM · {activeLabel}
            </div>
          )}
        </div>

        {/* Heatmap selector */}
        {Object.keys(result.gradcam_maps).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.keys(result.gradcam_maps).map((label) => (
              <button
                key={label}
                onClick={() => {
                  setActiveLabel(label);
                  setShowOriginal(false);
                }}
                className={`
                  text-xs px-3 py-1.5 rounded-full border
                  transition-colors font-medium
                  ${activeLabel === label && !showOriginal
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: predictions ── */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-800">
          Predictions
        </h3>

        {/* Top diagnosis card */}
        <div className="flex items-start gap-3 p-4 bg-blue-50
                        rounded-xl border border-blue-200">
          <AlertCircle className="w-5 h-5 text-blue-600
                                   flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-500 font-medium
                          uppercase tracking-wide">
              Top diagnosis
            </p>
            <p className="font-semibold text-blue-800 text-xl mt-0.5">
              {result.top_diagnosis}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              {(result.predictions[0].probability * 100).toFixed(1)}%
              confidence
            </p>
          </div>
          <span
            className={`ml-auto ${getRiskBadge(
              result.predictions[0].probability
            )}`}
          >
            {result.predictions[0].probability > 0.7
              ? "High"
              : result.predictions[0].probability > 0.4
              ? "Medium"
              : "Low"}
          </span>
        </div>

        {/* Probability bars */}
        <div className="space-y-3">
          {top5.map(({ label, probability }) => (
            <button
              key={label}
              onClick={() => {
                if (result.gradcam_maps[label]) {
                  setActiveLabel(label);
                  setShowOriginal(false);
                }
              }}
              className={`
                w-full text-left group transition-colors
                ${result.gradcam_maps[label]
                  ? "cursor-pointer"
                  : "cursor-default"
                }
              `}
            >
              <div className="flex justify-between
                              items-center text-sm mb-1.5">
                <span
                  className={`font-medium transition-colors
                    ${result.gradcam_maps[label]
                      ? "group-hover:text-blue-600"
                      : ""
                    }
                    ${activeLabel === label
                      ? "text-blue-600"
                      : "text-gray-700"
                    }
                  `}
                >
                  {label}
                  {result.gradcam_maps[label] && (
                    <span className="ml-1.5 text-xs text-gray-400
                                     font-normal">
                      (click for heatmap)
                    </span>
                  )}
                </span>
                <span className="text-gray-500 tabular-nums">
                  {(probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full
                              overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all
                    duration-500 ${getRiskColor(probability)}`}
                  style={{ width: `${probability * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* All predictions count */}
        <p className="text-xs text-gray-400">
          Showing top 5 of {result.predictions.length} classes.
          For research use only — not a clinical diagnosis.
        </p>
      </div>
    </div>
  );
}