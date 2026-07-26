import io
import os
import tempfile

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from activity_log import log_activity
from admin_routes import router as admin_router
from auth import get_current_user
from auth_routes import router as auth_router
from crud import (
    save_prediction_record,
    update_prediction_images,
    get_prediction_records,
    get_prediction_record_by_id,
    get_prediction_stats,
    delete_prediction_record,
    count_prediction_records,
    get_estimated_storage_usage,
)
from database import SessionLocal
from predict import load_class_names, load_sawit_model, predict_image
from report_routes import router as report_router
from storage_supabase import (
    delete_prediction_images_from_supabase,
    upload_prediction_images,
)

APP_STORAGE_LIMIT_GB = float(
    os.getenv("APP_STORAGE_LIMIT_GB", "1")
)

APP_STORAGE_LIMIT_BYTES = int(
    APP_STORAGE_LIMIT_GB * 1024 * 1024 * 1024
)

MIN_SAVE_CONFIDENCE = float(
    os.getenv("MIN_SAVE_CONFIDENCE", "70")
)
MAX_UPLOAD_SIZE_MB = 5
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

app = FastAPI(title="API Klasifikasi Sawit")

# Untuk production, isi CORS_ORIGINS dengan URL frontend, dipisahkan koma.
# Contoh: CORS_ORIGINS=https://sawitvision.vercel.app,http://localhost:5173
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(report_router)

class_names = load_class_names()
model = load_sawit_model()


@app.get("/")
def root():
    return {"message": "SawitVision AI Backend is running", "status": "ok"}


@app.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    temp_path = None

    try:
        contents = await file.read()
        file_size_bytes = len(contents)

        if file_size_bytes > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Ukuran gambar terlalu besar. Maksimal {MAX_UPLOAD_SIZE_MB} MB.",
            )
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Format file tidak didukung. Gunakan JPG, PNG, JPEG, atau WEBP.",
            )

        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="File bukan gambar yang valid.")

        image_width, image_height = image.size
        suffix = os.path.splitext(file.filename or "")[1].lower()
        if suffix not in [".jpg", ".jpeg", ".png", ".webp"]:
            suffix = ".jpg"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        predicted_class, confidence, probabilities = predict_image(
            model, temp_path, class_names
        )

        confidence_value = float(confidence)
        should_save_history = confidence_value >= MIN_SAVE_CONFIDENCE

        record = None
        image_urls = {
            "image_processed_url": None,
            "image_thumbnail_url": None,
        }
        storage_saved = False

        if not should_save_history:
            history_message = (
                f"Hasil prediksi tidak disimpan ke riwayat karena confidence "
                f"{confidence_value:.2f}% berada di bawah batas "
                f"{MIN_SAVE_CONFIDENCE:.2f}%."
            )
            storage_message = (
                "Gambar tidak disimpan karena hasil prediksi memiliki "
                "confidence rendah."
            )
        else:
            db = SessionLocal()
            try:
                record = save_prediction_record(
                    db=db,
                    predicted_class=predicted_class,
                    confidence=confidence_value,
                    probabilities=probabilities,
                    user_id=current_user["id"],
                    input_source="web_upload",
                    image_width=image_width,
                    image_height=image_height,
                    file_size_bytes=file_size_bytes,
                )
            finally:
                db.close()

            history_message = "Hasil prediksi berhasil disimpan ke riwayat."
            storage_message = "Gambar tidak disimpan."

            # Perkiraan tambahan storage:
            # processed 60% + thumbnail 10% = 70%.
            estimated_new_storage_bytes = int(file_size_bytes * 0.70)

            db = SessionLocal()
            try:
                current_storage_bytes = get_estimated_storage_usage(db)
                projected_storage_bytes = (
                    current_storage_bytes + estimated_new_storage_bytes
                )
                storage_available = (
                    projected_storage_bytes <= APP_STORAGE_LIMIT_BYTES
                )
            finally:
                db.close()

            if storage_available:
                try:
                    image_urls = upload_prediction_images(
                        image=image,
                        record_id=record["id"],
                    )

                    db = SessionLocal()
                    try:
                        update_prediction_images(
                            db=db,
                            record_id=record["id"],
                            image_processed_url=image_urls[
                                "image_processed_url"
                            ],
                            image_thumbnail_url=image_urls[
                                "image_thumbnail_url"
                            ],
                        )
                    finally:
                        db.close()

                    storage_saved = True
                    storage_message = "Gambar berhasil disimpan."

                except Exception as storage_error:
                    print(
                        "Prediksi tersimpan, tetapi gambar gagal disimpan:",
                        storage_error,
                    )
                    storage_message = (
                        "Hasil prediksi tersimpan, tetapi gambar gagal "
                        "disimpan ke storage."
                    )
            else:
                storage_message = (
                    "Hasil prediksi tersimpan, tetapi gambar tidak disimpan "
                    "karena kapasitas storage telah mencapai batas."
                )

        return {
            "record_id": record["id"] if record else None,
            "predicted_class": predicted_class,
            "confidence": round(confidence_value, 2),
            "history": {
                "saved": should_save_history,
                "message": history_message,
                "minimum_confidence": MIN_SAVE_CONFIDENCE,
            },
            "probabilities": {
                key: round(float(value), 2)
                for key, value in probabilities.items()
            },
            "image_processed_url": image_urls[
                "image_processed_url"
            ],
            "image_thumbnail_url": image_urls[
                "image_thumbnail_url"
            ],
            "storage": {
                "saved": storage_saved,
                "message": storage_message,
                "limit_gb": APP_STORAGE_LIMIT_GB,
            },
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.get("/predictions")
def list_predictions(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    limit = min(max(limit, 1), 50)
    offset = max(offset, 0)
    db = SessionLocal()
    try:
        records = get_prediction_records(
            db=db, user_id=current_user["id"], limit=limit, offset=offset
        )
        return {"total": len(records), "data": records}
    finally:
        db.close()


@app.get("/predictions/{record_id}")
def prediction_detail(
    record_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        record = get_prediction_record_by_id(
            db=db, record_id=record_id, user_id=current_user["id"]
        )
        if record is None:
            raise HTTPException(status_code=404, detail="Data prediksi tidak ditemukan")
        return record
    finally:
        db.close()


@app.delete("/predictions/{record_id}")
def delete_prediction(
    record_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        record = get_prediction_record_by_id(
            db=db, record_id=record_id, user_id=current_user["id"]
        )
        if record is None:
            raise HTTPException(status_code=404, detail="Data prediksi tidak ditemukan")

        storage_result = {"deleted_paths": [], "message": "Penghapusan gambar tidak dijalankan."}
        try:
            storage_result = delete_prediction_images_from_supabase(
                image_processed_url=record.get("image_processed_url"),
                image_thumbnail_url=record.get("image_thumbnail_url"),
            )
        except Exception as storage_error:
            print("Gagal menghapus gambar dari Supabase:", storage_error)

        deleted_id = delete_prediction_record(db, record_id)
        if deleted_id is None:
            raise HTTPException(status_code=404, detail="Data prediksi gagal dihapus")

        log_activity(
            db,
            "DELETE_HISTORY",
            "Pengguna menghapus satu riwayat prediksi.",
            request=request,
            user_id=current_user["id"],
            actor_user_id=current_user["id"],
            metadata={
                "record_id": deleted_id,
                "predicted_class": record.get("predicted_class"),
            },
        )

        return {
            "message": "Data prediksi berhasil dihapus",
            "deleted_record_id": deleted_id,
            "storage": storage_result,
        }
    finally:
        db.close()


@app.get("/stats")
def prediction_stats(current_user: dict = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return get_prediction_stats(db=db, user_id=current_user["id"])
    finally:
        db.close()