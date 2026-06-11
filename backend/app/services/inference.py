import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from io import BytesIO
import albumentations as A
from albumentations.pytorch import ToTensorV2
from app.core.config import settings
import timm


INFERENCE_TRANSFORMS = A.Compose([
    A.Resize(settings.IMAGE_SIZE, settings.IMAGE_SIZE),
    A.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
    ToTensorV2(),
])


class ChestClassifier(nn.Module):
    """Matches exactly the architecture used in training."""
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model(
            'resnet50', pretrained=False, num_classes=0
        )
        feature_dim = self.backbone.num_features
        self.classifier = nn.Sequential(
            nn.Linear(feature_dim, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(512, 14)
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))


class InferenceService:
    def __init__(self):
        self.device = torch.device("cpu")
        self.model = self._load_model()

    def _load_model(self):
        model = ChestClassifier()
        try:
            checkpoint = torch.load(
                settings.CHECKPOINT_PATH,
                map_location=self.device
            )
            model.load_state_dict(checkpoint["model_state_dict"])
            print(f"Model loaded. AUC: {checkpoint.get('mean_auc', 'N/A')}")
        except Exception as e:
            print(f"Checkpoint error: {e}")
            print("Using random weights — predictions will be unreliable")
        model.eval()
        return model

    def predict(self, image_bytes: bytes, explain: bool = True) -> dict:
        original_image = np.array(
            Image.open(BytesIO(image_bytes)).convert("RGB")
        )

        transformed = INFERENCE_TRANSFORMS(image=original_image)
        tensor = transformed["image"].unsqueeze(0).to(self.device)

        self.model.eval()
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.sigmoid(logits).squeeze().cpu().numpy()

        predictions = [
            {
                "label": label,
                "probability": round(float(prob), 4)
            }
            for label, prob in zip(settings.DISEASE_LABELS, probs)
        ]
        predictions.sort(
            key=lambda x: x["probability"],
            reverse=True
        )

        return {
            "predictions": predictions,
            "top_diagnosis": predictions[0]["label"],
            "gradcam_maps": {},
        }


_inference_service = None


def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service