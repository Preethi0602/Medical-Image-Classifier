import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.cuda.amp import GradScaler, autocast
from sklearn.metrics import roc_auc_score
import numpy as np
import mlflow
import mlflow.pytorch
from pathlib import Path
from app.core.config import settings
from app.models.classifier import ChestXRayClassifier
from app.services.dataset import get_dataloaders


class FocalLoss(nn.Module):
    """
    Focal loss for class imbalance.
    Downweights easy examples, focuses on hard ones.
    Essential for medical imaging where most pixels/labels are negative.
    """

    def __init__(self, alpha: float = 0.25, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.bce = nn.BCEWithLogitsLoss(reduction="none")

    def forward(
        self,
        logits: torch.Tensor,
        targets: torch.Tensor
    ) -> torch.Tensor:
        bce_loss = self.bce(logits, targets)
        probs = torch.sigmoid(logits)
        pt = torch.where(targets == 1, probs, 1 - probs)
        focal_weight = self.alpha * (1 - pt) ** self.gamma
        return (focal_weight * bce_loss).mean()


def compute_mean_auc(
    all_labels: np.ndarray,
    all_probs: np.ndarray
) -> float:
    """Mean AUC across all 14 disease classes."""
    aucs = []
    for i in range(all_labels.shape[1]):
        # Skip if only one class present in batch
        if len(np.unique(all_labels[:, i])) > 1:
            aucs.append(
                roc_auc_score(all_labels[:, i], all_probs[:, i])
            )
    return float(np.mean(aucs))


def train(csv_path: str, img_dir: str) -> float:
    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )
    print(f"Training on: {device}")

    train_loader, val_loader = get_dataloaders(csv_path, img_dir)
    model = ChestXRayClassifier().to(device)
    criterion = FocalLoss(alpha=0.25, gamma=2.0)

    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=settings.LEARNING_RATE,
        weight_decay=1e-4
    )
    scheduler = CosineAnnealingLR(
        optimizer,
        T_max=settings.NUM_EPOCHS
    )
    scaler = GradScaler()  # mixed precision training

    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)

    with mlflow.start_run():

        # Log hyperparameters
        mlflow.log_params({
            "model": settings.MODEL_NAME,
            "epochs": settings.NUM_EPOCHS,
            "batch_size": settings.BATCH_SIZE,
            "lr": settings.LEARNING_RATE,
            "loss": "FocalLoss",
            "optimizer": "AdamW",
        })

        best_auc = 0.0
        Path("checkpoints").mkdir(exist_ok=True)

        for epoch in range(settings.NUM_EPOCHS):

            # ── Training ──────────────────────────────────────
            model.train()
            train_loss = 0.0

            for images, labels in train_loader:
                images = images.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with autocast():  # mixed precision forward pass
                    logits = model(images)
                    loss = criterion(logits, labels)

                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(
                    model.parameters(), max_norm=1.0
                )
                scaler.step(optimizer)
                scaler.update()
                train_loss += loss.item()

            scheduler.step()
            avg_train_loss = train_loss / len(train_loader)

            # ── Validation ────────────────────────────────────
            model.eval()
            all_labels, all_probs = [], []
            val_loss = 0.0

            with torch.no_grad():
                for images, labels in val_loader:
                    images = images.to(device)
                    labels = labels.to(device)
                    logits = model(images)
                    val_loss += criterion(logits, labels).item()
                    all_probs.append(
                        torch.sigmoid(logits).cpu().numpy()
                    )
                    all_labels.append(labels.cpu().numpy())

            all_labels = np.concatenate(all_labels)
            all_probs = np.concatenate(all_probs)
            mean_auc = compute_mean_auc(all_labels, all_probs)
            avg_val_loss = val_loss / len(val_loader)

            # Log metrics to MLflow
            mlflow.log_metrics({
                "train_loss": avg_train_loss,
                "val_loss": avg_val_loss,
                "mean_auc": mean_auc,
                "lr": scheduler.get_last_lr()[0],
            }, step=epoch)

            print(
                f"Epoch {epoch+1}/{settings.NUM_EPOCHS} | "
                f"Train Loss: {avg_train_loss:.4f} | "
                f"Val Loss: {avg_val_loss:.4f} | "
                f"AUC: {mean_auc:.4f}"
            )

            # Save best model
            if mean_auc > best_auc:
                best_auc = mean_auc
                torch.save({
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "mean_auc": mean_auc,
                }, "checkpoints/best_model.pth")
                mlflow.pytorch.log_model(model, "model")

        # ── CI/CD Eval Gate ───────────────────────────────────
        print(f"\nBest AUC: {best_auc:.4f}")
        print(f"Gate threshold: {settings.AUC_GATE_THRESHOLD}")

        if best_auc < settings.AUC_GATE_THRESHOLD:
            raise ValueError(
                f"AUC {best_auc:.4f} below gate "
                f"threshold {settings.AUC_GATE_THRESHOLD}. "
                "Deployment blocked."
            )

        print("Eval gate PASSED. Registering model.")
        mlflow.log_metric("gate_passed", 1.0)
        mlflow.register_model(
            f"runs:/{mlflow.active_run().info.run_id}/model",
            "ChestXRayClassifier"
        )

    return best_auc