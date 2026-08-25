import torch
import torch.nn as nn
import timm
from app.core.config import settings


class ChestXRayClassifier(nn.Module):
    """
    ResNet-50 fine-tuned for multi-label chest X-ray classification.

    Architecture:
        - Pretrained ImageNet backbone (early layers frozen)
        - Custom classification head with dropout
        - Sigmoid output for multi-label (each disease independent)
    """

    def __init__(
        self,
        model_name: str = settings.MODEL_NAME,
        num_classes: int = settings.NUM_CLASSES
    ):
        super().__init__()

        # Load pretrained backbone via timm
        self.backbone = timm.create_model(
            model_name,
            pretrained=True,
            num_classes=0        # remove default head
        )
        feature_dim = self.backbone.num_features

        # Freeze first 6 backbone layers
        self._freeze_early_layers()

        # Custom multi-label classification head
        self.classifier = nn.Sequential(
            nn.Linear(feature_dim, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.4),
            nn.Linear(512, num_classes),
        )

    def _freeze_early_layers(self):
        """Freeze early backbone layers — fine-tune from layer3 onwards."""
        layers = list(self.backbone.children())
        for layer in layers[:6]:
            for param in layer.parameters():
                param.requires_grad = False

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        logits = self.classifier(features)
        return logits  

    def get_features(self, x: torch.Tensor) -> torch.Tensor:
        """Return feature embeddings before classifier (used by Grad-CAM)."""
        return self.backbone(x)


def load_model(
    checkpoint_path: str,
    device: torch.device
) -> ChestXRayClassifier:
    """Load model from checkpoint."""
    model = ChestXRayClassifier()
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model.to(device)
