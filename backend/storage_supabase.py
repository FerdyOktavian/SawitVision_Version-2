import os
from io import BytesIO
from datetime import datetime

from dotenv import load_dotenv
from PIL import Image
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "sawitvision-images")


def get_supabase_client():
    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL belum diisi di file .env")

    if not SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY belum diisi di file .env")

    if not SUPABASE_BUCKET:
        raise ValueError("SUPABASE_BUCKET belum diisi di file .env")

    return create_client(SUPABASE_URL, SUPABASE_KEY)


def image_to_webp_bytes(image: Image.Image, max_size: int, quality: int):
    img = image.copy().convert("RGB")
    img.thumbnail((max_size, max_size))

    buffer = BytesIO()
    img.save(buffer, format="WEBP", quality=quality)
    buffer.seek(0)

    return buffer.getvalue(), img.size


def make_storage_paths(record_id: str):
    now = datetime.now()

    base_path = (
        f"predictions/"
        f"{now.year}/"
        f"{now.month:02d}/"
        f"{now.day:02d}/"
        f"{record_id}"
    )

    return {
        "processed_path": f"{base_path}/processed.webp",
        "thumbnail_path": f"{base_path}/thumbnail.webp",
    }


def upload_bytes_to_supabase(file_bytes: bytes, storage_path: str):
    supabase = get_supabase_client()

    # Jangan pakai dict file_options dulu, karena beberapa versi supabase-py error.
    supabase.storage.from_(SUPABASE_BUCKET).upload(
        storage_path,
        file_bytes
    )

    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)

    # Beberapa versi balikin string, beberapa balikin object/dict.
    if isinstance(public_url, str):
        return public_url

    if isinstance(public_url, dict):
        return public_url.get("publicUrl") or public_url.get("public_url") or str(public_url)

    if hasattr(public_url, "public_url"):
        return public_url.public_url

    return str(public_url)


def upload_prediction_images(image: Image.Image, record_id: str):
    paths = make_storage_paths(record_id)

    processed_bytes, processed_size = image_to_webp_bytes(
        image=image,
        max_size=1024,
        quality=82,
    )

    thumbnail_bytes, thumbnail_size = image_to_webp_bytes(
        image=image,
        max_size=320,
        quality=75,
    )

    processed_url = upload_bytes_to_supabase(
        file_bytes=processed_bytes,
        storage_path=paths["processed_path"],
    )

    thumbnail_url = upload_bytes_to_supabase(
        file_bytes=thumbnail_bytes,
        storage_path=paths["thumbnail_path"],
    )

    return {
        "image_processed_url": processed_url,
        "image_thumbnail_url": thumbnail_url,
        "processed_size": processed_size,
        "thumbnail_size": thumbnail_size,
    }
from urllib.parse import unquote


def extract_supabase_storage_path(file_url: str):
    """
    Mengambil path object Supabase dari public URL.
    Contoh:
    https://xxx.supabase.co/storage/v1/object/public/sawitvision-images/predictions/2026/...
    menjadi:
    predictions/2026/...
    """
    if not file_url:
        return None

    # Kalau yang tersimpan sudah berupa path langsung
    if file_url.startswith("predictions/"):
        return file_url

    marker = f"/storage/v1/object/public/{SUPABASE_BUCKET}/"

    if marker not in file_url:
        return None

    path = file_url.split(marker, 1)[1]
    path = path.split("?", 1)[0]

    return unquote(path)


def delete_prediction_images_from_supabase(
    image_processed_url=None,
    image_thumbnail_url=None,
):
    """
    Menghapus file gambar dari Supabase Storage berdasarkan URL yang tersimpan di Neon.
    """
    supabase = get_supabase_client()

    paths = []

    processed_path = extract_supabase_storage_path(image_processed_url)
    thumbnail_path = extract_supabase_storage_path(image_thumbnail_url)

    if processed_path:
        paths.append(processed_path)

    if thumbnail_path:
        paths.append(thumbnail_path)

    # Hilangkan duplikat path
    paths = list(dict.fromkeys(paths))

    if not paths:
        return {
            "deleted_paths": [],
            "message": "Tidak ada path gambar yang bisa dihapus.",
        }

    supabase.storage.from_(SUPABASE_BUCKET).remove(paths)

    return {
        "deleted_paths": paths,
        "message": "Gambar berhasil dihapus dari Supabase Storage.",
    }

def delete_storage_paths_from_supabase(paths):
    clean_paths = [
        path for path in dict.fromkeys(paths or [])
        if isinstance(path, str) and path.strip()
    ]
    if not clean_paths:
        return {"deleted_paths": [], "message": "Tidak ada path storage yang dapat dihapus."}

    supabase = get_supabase_client()
    supabase.storage.from_(SUPABASE_BUCKET).remove(clean_paths)
    return {
        "deleted_paths": clean_paths,
        "message": "Object storage berhasil dihapus.",
    }
