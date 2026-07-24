import os
from pathlib import Path

from huggingface_hub import hf_hub_download


HF_MODEL_REPO = os.getenv(
    "HF_MODEL_REPO",
    "username/nama-repository-model",
)

HF_MODEL_FILENAME = os.getenv(
    "HF_MODEL_FILENAME",
    "model_sawit.keras",
)

HF_TOKEN = os.getenv("HF_TOKEN")

LOCAL_MODEL_DIR = Path(
    os.getenv("LOCAL_MODEL_DIR", "models")
)

LOCAL_MODEL_PATH = LOCAL_MODEL_DIR / HF_MODEL_FILENAME


def ensure_model_downloaded() -> str:
    """
    Memastikan model tersedia secara lokal.

    Jika belum tersedia, file diunduh dari Hugging Face Hub.
    """

    LOCAL_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    if LOCAL_MODEL_PATH.exists():
        print(f"Model ditemukan: {LOCAL_MODEL_PATH}")
        return str(LOCAL_MODEL_PATH)

    print("Model belum tersedia. Mengunduh dari Hugging Face Hub...")

    downloaded_path = hf_hub_download(
        repo_id=HF_MODEL_REPO,
        filename=HF_MODEL_FILENAME,
        token=HF_TOKEN or None,
        local_dir=str(LOCAL_MODEL_DIR),
    )

    print(f"Model berhasil diunduh: {downloaded_path}")
    return downloaded_path