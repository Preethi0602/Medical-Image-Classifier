from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
import mlflow
from app.core.config import settings
from app.services.inference import get_inference_service, InferenceService

router = APIRouter(
    prefix=f"/api/{settings.API_VERSION}",
    tags=["classifier"]
)


# ── Response schemas ──────────────────────────────────────────────

class PredictionResult(BaseModel):
    label: str
    probability: float

class InferenceResponse(BaseModel):
    predictions: list[PredictionResult]
    top_diagnosis: str
    gradcam_maps: dict[str, str]

class ExperimentRun(BaseModel):
    run_id: str
    run_name: str
    mean_auc: float
    train_loss: float
    val_loss: float
    status: str
    start_time: str

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
def health_check(
    svc: InferenceService = Depends(get_inference_service)
):
    return {
        "status": "ok",
        "model": settings.MODEL_NAME,
        "device": str(svc.device),
    }


@router.post("/predict", response_model=InferenceResponse)
async def predict(
    file: UploadFile = File(...),
    explain: bool = True,
    svc: InferenceService = Depends(get_inference_service),
):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=400,
            detail="Only JPEG or PNG images accepted."
        )

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image too large. Max size is 10 MB."
        )

    try:
        result = svc.predict(image_bytes, explain=explain)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}"
        )

    return result


@router.get("/experiments")
def get_experiments():
    """Return all MLflow experiment runs."""
    try:
        client = mlflow.tracking.MlflowClient(
            tracking_uri=settings.MLFLOW_TRACKING_URI
        )
        experiment = client.get_experiment_by_name(
            settings.MLFLOW_EXPERIMENT_NAME
        )
        if not experiment:
            return []

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["metrics.mean_auc DESC"],
            max_results=20,
        )
        return [
            {
                "run_id": r.info.run_id,
                "run_name": r.info.run_name or r.info.run_id[:8],
                "mean_auc": r.data.metrics.get("mean_auc", 0),
                "train_loss": r.data.metrics.get("train_loss", 0),
                "val_loss": r.data.metrics.get("val_loss", 0),
                "status": r.info.status,
                "start_time": str(r.info.start_time),
            }
            for r in runs
        ]
    except Exception:
        return []


@router.get("/model-registry")
def get_model_registry():
    """Return registered model versions from MLflow."""
    try:
        client = mlflow.tracking.MlflowClient(
            tracking_uri=settings.MLFLOW_TRACKING_URI
        )
        versions = client.search_model_versions(
            "name='ChestXRayClassifier'"
        )
        return [
            {
                "version": v.version,
                "stage": v.current_stage,
                "run_id": v.run_id,
                "status": v.status,
            }
            for v in versions
        ]
    except Exception:
        return []


@router.get("/labels")
def get_labels():
    """Return the 14 disease class labels."""
    return {"labels": settings.DISEASE_LABELS}