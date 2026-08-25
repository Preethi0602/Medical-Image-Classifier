import pytest
import torch
import numpy as np
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image

from app.main import app
from app.models.classifier import ChestXRayClassifier
from app.services.dataset import TRAIN_TRANSFORMS, VAL_TRANSFORMS
from app.core.config import settings

client = TestClient(app)


def test_model_output_shape():
    """Model should output [batch, 14] logits."""
    model = ChestXRayClassifier()
    dummy = torch.randn(2, 3, 224, 224)
    with torch.no_grad():
        output = model(dummy)
    assert output.shape == (2, settings.NUM_CLASSES)


def test_model_frozen_layers():
    """Early layers should be frozen."""
    model = ChestXRayClassifier()
    all_params = list(model.backbone.parameters())
    trainable = [p for p in all_params if p.requires_grad]
    assert len(trainable) < len(all_params)


def test_sigmoid_probabilities():
    """Sigmoid output should be in [0, 1]."""
    model = ChestXRayClassifier()
    model.eval()  # eval mode allows batch size of 1
    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        logits = model(dummy)
        probs = torch.sigmoid(logits)
    assert probs.min() >= 0.0
    assert probs.max() <= 1.0



def test_train_transforms():
    """Train transforms should output correct tensor shape."""
    dummy_img = np.random.randint(
        0, 255, (512, 512, 3), dtype=np.uint8
    )
    result = TRAIN_TRANSFORMS(image=dummy_img)
    assert result["image"].shape == (
        3,
        settings.IMAGE_SIZE,
        settings.IMAGE_SIZE
    )


def test_val_transforms():
    """Val transforms should output correct tensor shape."""
    dummy_img = np.random.randint(
        0, 255, (512, 512, 3), dtype=np.uint8
    )
    result = VAL_TRANSFORMS(image=dummy_img)
    assert result["image"].shape == (
        3,
        settings.IMAGE_SIZE,
        settings.IMAGE_SIZE
    )



def test_health_endpoint():
    with patch("app.api.routes.get_inference_service") as mock:
        mock_svc = MagicMock()
        mock_svc.device = "cpu"
        mock.return_value = mock_svc
        response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_labels_endpoint():
    response = client.get("/api/v1/labels")
    assert response.status_code == 200
    data = response.json()
    assert "labels" in data
    assert len(data["labels"]) == 14
    assert "Pneumonia" in data["labels"]
    assert "Atelectasis" in data["labels"]


def test_predict_rejects_non_image():
    """Should return 400 for non-image files."""
    with patch("app.api.routes.get_inference_service"):
        response = client.post(
            "/api/v1/predict",
            files={
                "file": ("test.txt", b"not an image", "text/plain")
            },
        )
    assert response.status_code == 400


def _make_dummy_png() -> bytes:
    img = Image.fromarray(
        np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    )
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_predict_valid_image():
    """Should return predictions for a valid image."""
    mock_result = {
        "predictions": [
            {"label": "Pneumonia", "probability": 0.91}
        ],
        "top_diagnosis": "Pneumonia",
        "gradcam_maps": {},
    }
    with patch("app.api.routes.get_inference_service") as mock:
        mock_svc = MagicMock()
        mock_svc.predict.return_value = mock_result
        mock.return_value = mock_svc
        response = client.post(
            "/api/v1/predict",
            files={
                "file": (
                    "xray.png",
                    _make_dummy_png(),
                    "image/png"
                )
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert "top_diagnosis" in data
    assert "gradcam_maps" in data
