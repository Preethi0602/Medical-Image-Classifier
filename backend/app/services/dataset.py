import pandas as pd
import numpy as np
from pathlib import Path
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
import albumentations as A
from albumentations.pytorch import ToTensorV2
from app.core.config import settings


TRAIN_TRANSFORMS = A.Compose([
    A.Resize(settings.IMAGE_SIZE, settings.IMAGE_SIZE),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(
        brightness_limit=0.2,
        contrast_limit=0.2,
        p=0.5
    ),
    A.ShiftScaleRotate(
        shift_limit=0.05,
        scale_limit=0.1,
        rotate_limit=10,
        p=0.5
    ),
    A.GaussNoise(var_limit=(10, 50), p=0.3),
    A.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
    ToTensorV2(),
])

VAL_TRANSFORMS = A.Compose([
    A.Resize(settings.IMAGE_SIZE, settings.IMAGE_SIZE),
    A.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
    ToTensorV2(),
])


class ChestXRayDataset(Dataset):
    """
    NIH Chest X-ray 14 Dataset.
    Labels are pipe-separated in CSV:
    e.g. "Atelectasis|Effusion|No Finding"
    """

    def __init__(
        self,
        csv_path: str,
        img_dir: str,
        transform=None,
        split: str = "train"
    ):
        self.df = pd.read_csv(csv_path)
        self.img_dir = Path(img_dir)
        self.transform = transform
        self.labels = settings.DISEASE_LABELS

        # Split by patient ID to avoid data leakage
        patient_ids = self.df["Patient ID"].unique()
        np.random.seed(42)
        np.random.shuffle(patient_ids)
        split_idx = int(len(patient_ids) * 0.8)
        train_patients = set(patient_ids[:split_idx])
        val_patients = set(patient_ids[split_idx:])

        if split == "train":
            self.df = self.df[
                self.df["Patient ID"].isin(train_patients)
            ].reset_index(drop=True)
        else:
            self.df = self.df[
                self.df["Patient ID"].isin(val_patients)
            ].reset_index(drop=True)

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(
        self,
        idx: int
    ) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[idx]
        # Support both full paths and relative paths
        img_path = Path(row["Image Index"])
        if not img_path.is_absolute() and not img_path.exists():
            img_path = self.img_dir / row["Image Index"]
        image = np.array(
            Image.open(img_path).convert("RGB")
        )

        if self.transform:
            image = self.transform(image=image)["image"]

        # Multi-hot encode labels
        label_str = row["Finding Labels"]
        label_vec = torch.zeros(
            len(self.labels),
            dtype=torch.float32
        )
        for disease in label_str.split("|"):
            disease = disease.strip()
            if disease in self.labels:
                label_vec[self.labels.index(disease)] = 1.0

        return image, label_vec


def get_dataloaders(
    csv_path: str,
    img_dir: str
) -> tuple[DataLoader, DataLoader]:

    train_ds = ChestXRayDataset(
        csv_path, img_dir,
        transform=TRAIN_TRANSFORMS,
        split="train"
    )
    val_ds = ChestXRayDataset(
        csv_path, img_dir,
        transform=VAL_TRANSFORMS,
        split="val"
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=settings.BATCH_SIZE,
        shuffle=True,
        num_workers=settings.NUM_WORKERS,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=settings.BATCH_SIZE,
        shuffle=False,
        num_workers=settings.NUM_WORKERS,
        pin_memory=True
    )
    return train_loader, val_loader