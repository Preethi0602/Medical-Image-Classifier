import { useState, useCallback } from "react";
import { predictImage } from "../utils/api";
import type {
  InferenceResponse,
  UploadState,
} from "../types";

interface UseInferenceReturn {
  result: InferenceResponse | null;
  previewUrl: string | null;
  state: UploadState;
  error: string | null;
  run: (file: File) => Promise<void>;
  reset: () => void;
}

export function useInference(): UseInferenceReturn {
  const [result, setResult] = useState<InferenceResponse | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (file: File) => {
    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setState("uploading");
    setError(null);
    setResult(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const data = await predictImage(file, true);
      setResult(data);
      setState("success");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Inference failed.";
      setError(message);
      setState("error");
    }
  }, [previewUrl]);

  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setResult(null);
    setPreviewUrl(null);
    setState("idle");
    setError(null);
  }, [previewUrl]);

  return { result, previewUrl, state, error, run, reset };
}