from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Medical Image Disease Classifier"
    API_VERSION: str = "v1"
    DEBUG: bool = False

    # Model
    MODEL_NAME: str = "resnet50"
    NUM_CLASSES: int = 14
    IMAGE_SIZE: int = 224
    CHECKPOINT_PATH: str = "checkpoints/best_model.pth"

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5003"
    MLFLOW_EXPERIMENT_NAME: str = "chest-xray-classifier"
    AUC_GATE_THRESHOLD: float = 0.60

    # Training
    BATCH_SIZE: int = 32
    LEARNING_RATE: float = 1e-4
    NUM_EPOCHS: int = 3
    NUM_WORKERS: int = 4

    # Data
    DATA_DIR: str = "data/chest_xray"
    LABELS_CSV: str = "data/pneumonia_labels.csv"

    # Disease labels (NIH Chest X-ray 14)
    DISEASE_LABELS: list[str] = [
        "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
        "Effusion", "Emphysema", "Fibrosis", "Hernia",
        "Infiltration", "Mass", "Nodule", "Pleural_Thickening",
        "Pneumonia", "Pneumothorax",
    ]

    class Config:
        env_file = ".env"

settings = Settings()