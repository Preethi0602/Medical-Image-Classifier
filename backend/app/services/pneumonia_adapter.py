import os
import pandas as pd
from pathlib import Path


def create_pneumonia_csv(data_dir: str, output_csv: str):
    """
    Converts chest_xray folder structure to NIH-style CSV.
    
    Folder structure:
        chest_xray/train/NORMAL/*.jpeg
        chest_xray/train/PNEUMONIA/*.jpeg
        chest_xray/test/NORMAL/*.jpeg
        chest_xray/test/PNEUMONIA/*.jpeg
    """
    rows = []
    data_path = Path(data_dir)

    for split in ["train", "test", "val"]:
        split_path = data_path / split
        if not split_path.exists():
            continue

        for label_folder in ["NORMAL", "PNEUMONIA"]:
            folder = split_path / label_folder
            if not folder.exists():
                continue

            for img_file in folder.glob("*.jpeg"):
                finding = "Pneumonia" if label_folder == "PNEUMONIA" else "No Finding"
                rows.append({
                    "Image Index": str(img_file),
                    "Finding Labels": finding,
                    "Patient ID": img_file.stem,
                    "split": split,
                })

    df = pd.DataFrame(rows)
    df.to_csv(output_csv, index=False)
    print(f"CSV created: {output_csv}")
    print(f"Total images: {len(df)}")
    print(df["Finding Labels"].value_counts())
    return output_csv


if __name__ == "__main__":
    create_pneumonia_csv(
        data_dir="data/chest_xray",
        output_csv="data/pneumonia_labels.csv"
    )