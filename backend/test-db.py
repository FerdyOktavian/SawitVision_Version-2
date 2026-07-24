from database import SessionLocal
from crud import get_active_model_version

db = SessionLocal()

try:
    model_version_id = get_active_model_version(db)
    print("Active model version ID:", model_version_id)

    if model_version_id:
        print("Koneksi Neon berhasil.")
    else:
        print("Koneksi berhasil, tapi belum ada model aktif.")
finally:
    db.close()