import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon, Loader2, X } from "lucide-react";
import type { UploadState } from "../../types";

interface Props {
  state: UploadState;
  error: string | null;
  onFile: (file: File) => void;
  onReset: () => void;
}

export function UploadZone({ state, error, onFile, onReset }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
    disabled: state === "uploading",
  });

  const isUploading = state === "uploading";

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-12
          text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }
          ${isUploading ? "opacity-60 cursor-not-allowed" : ""}
          ${error ? "border-red-300 bg-red-50" : ""}
        `}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="font-medium text-blue-700">
                Analyzing X-ray...
              </p>
              <p className="text-sm text-blue-500 mt-1">
                Running inference and generating Grad-CAM heatmaps
              </p>
            </div>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <ImageIcon className="w-8 h-8 text-blue-600" />
            </div>
            <p className="font-medium text-blue-700">
              Drop the X-ray here
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Upload a chest X-ray
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPEG or PNG · max 10 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between
                        px-4 py-3 bg-red-50 border border-red-200
                        rounded-lg">
          <p className="text-sm text-red-600 font-medium">
            {error}
          </p>
          <button
            onClick={onReset}
            className="ml-3 text-red-400 hover:text-red-600
                       transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-center text-gray-400">
        For research purposes only — not intended for clinical diagnosis.
      </p>
    </div>
  );
}