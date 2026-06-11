export interface Prediction {
    label: string;
    probability: number;
  }
  
  export interface InferenceResponse {
    predictions: Prediction[];
    top_diagnosis: string;
    gradcam_maps: Record<string, string>; // label → base64 PNG
  }
  
  export interface ExperimentRun {
    run_id: string;
    run_name: string;
    mean_auc: number;
    train_loss: number;
    val_loss: number;
    status: string;
    start_time: string;
  }
  
  export interface ModelVersion {
    version: string;
    stage: string;
    run_id: string;
    status: string;
  }
  
  export type UploadState =
    | "idle"
    | "uploading"
    | "success"
    | "error";
  
  export type Tab =
    | "inference"
    | "experiments"
    | "registry";
  
  export const DISEASE_LABELS = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Effusion",
    "Emphysema",
    "Fibrosis",
    "Hernia",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pleural_Thickening",
    "Pneumonia",
    "Pneumothorax",
  ] as const;
  
  export type DiseaseLabel = typeof DISEASE_LABELS[number];
  
  export interface HealthStatus {
    status: string;
    model: string;
    device: string;
  }