import torch
import numpy as np
import base64
from PIL import Image
from io import BytesIO
from torchcam.methods import GradCAM
from torchcam.utils import overlay_mask
from torchvision.transforms.functional import to_pil_image
from app.core.config import settings


class GradCAMService:
    """
    Grad-CAM heatmap generation for model explainability.
    Highlights which regions of the X-ray triggered the prediction.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        target_layer: str = "backbone.layer4"
    ):
        self.model = model
        self.cam_extractor = GradCAM(
            model,
            target_layer=target_layer
        )

    def generate(
        self,
        image_tensor: torch.Tensor,
        class_idx: int,
        original_image: np.ndarray,
    ) -> str:
        """
        Generate Grad-CAM heatmap overlay.

        Args:
            image_tensor: preprocessed tensor [1, C, H, W]
            class_idx: disease class index to explain
            original_image: original RGB numpy array

        Returns:
            base64-encoded PNG string
        """
        self.model.eval()
        image_tensor.requires_grad_(True)

        # Forward pass
        logits = self.model(image_tensor)

        # Generate CAM for target class
        activation_map = self.cam_extractor(class_idx, logits)
        cam = activation_map[0].squeeze().cpu()

        # Normalize to [0, 1]
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

        # Overlay heatmap on original image
        original_pil = Image.fromarray(original_image)
        result = overlay_mask(
            original_pil,
            to_pil_image(cam, mode="F"),
            alpha=0.5,
            colormap="jet",
        )

        # Encode as base64 for API response
        buffer = BytesIO()
        result.save(buffer, format="PNG")
        encoded = base64.b64encode(
            buffer.getvalue()
        ).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def generate_all_classes(
        self,
        image_tensor: torch.Tensor,
        probs: list[float],
        original_image: np.ndarray,
        top_k: int = 3,
    ) -> dict[str, str]:
        """
        Generate Grad-CAM heatmaps for top-k predicted diseases.

        Returns:
            dict of { disease_label: base64_png }
        """
        top_indices = np.argsort(probs)[::-1][:top_k]
        results = {}
        for idx in top_indices:
            label = settings.DISEASE_LABELS[idx]
            results[label] = self.generate(
                image_tensor.clone(),
                int(idx),
                original_image
            )
        return results