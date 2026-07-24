from typing import Optional
import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from activity_log import log_activity
from auth import get_current_admin
from database import get_db
from crud import get_oldest_prediction_images, clear_prediction_image_urls
from storage_supabase import delete_prediction_images_from_supabase

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def get_admin_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    active_users = db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = TRUE")).scalar()
    verified_users = db.execute(text("SELECT COUNT(*) FROM users WHERE is_verified = TRUE")).scalar()
    admin_users = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'")).scalar()
    regular_users = db.execute(text("SELECT COUNT(*) FROM users WHERE role = 'user'")).scalar()
    total_predictions = db.execute(text("SELECT COUNT(*) FROM prediction_records")).scalar()
    total_logs = db.execute(text("SELECT COUNT(*) FROM activity_logs")).scalar()

    prediction_rows = db.execute(text("""
        SELECT predicted_class, COUNT(*) AS total, AVG(confidence) AS avg_confidence
        FROM prediction_records GROUP BY predicted_class ORDER BY total DESC
    """)).fetchall()
    predictions_by_class = {
        row[0]: {
            "total": int(row[1]),
            "avg_confidence": round(float(row[2]), 2) if row[2] else 0,
        }
        for row in prediction_rows
    }

    recent_predictions = db.execute(text("""
        SELECT pr.id, pr.predicted_class, pr.confidence, pr.created_at,
               u.full_name, u.email
        FROM prediction_records pr
        LEFT JOIN users u ON pr.user_id = u.id
        ORDER BY pr.created_at DESC LIMIT 10
    """)).fetchall()

    return {
        "admin": {
            "id": current_admin["id"], "name": current_admin["name"],
            "email": current_admin["email"], "role": current_admin["role"],
        },
        "users": {
            "total": int(total_users or 0), "active": int(active_users or 0),
            "verified": int(verified_users or 0), "admin": int(admin_users or 0),
            "regular": int(regular_users or 0),
        },
        "predictions": {
            "total": int(total_predictions or 0),
            "by_class": predictions_by_class,
            "recent": [
                {
                    "id": str(row[0]), "predicted_class": row[1],
                    "confidence": float(row[2] or 0),
                    "created_at": row[3].isoformat() if row[3] else None,
                    "user_name": row[4] or "Tidak diketahui", "user_email": row[5] or "-",
                }
                for row in recent_predictions
            ],
        },
        "activity_logs": {"total": int(total_logs or 0)},
    }


@router.get("/users")
def get_admin_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, max_length=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    search_value = f"%{search.strip()}%" if search and search.strip() else None
    filter_sql = """
        WHERE (:search IS NULL OR u.full_name ILIKE :search OR u.email ILIKE :search)
    """
    params = {"search": search_value, "limit": limit, "offset": offset}

    total = db.execute(
        text(f"SELECT COUNT(*) FROM users u {filter_sql}"),
        {"search": search_value},
    ).scalar()

    rows = db.execute(text(f"""
        SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.is_verified,
               u.created_at, COUNT(pr.id) AS total_predictions
        FROM users u
        LEFT JOIN prediction_records pr ON pr.user_id = u.id
        {filter_sql}
        GROUP BY u.id, u.full_name, u.email, u.role, u.is_active,
                 u.is_verified, u.created_at
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    return {
        "total": int(total or 0), "limit": limit, "offset": offset,
        "has_more": offset + limit < int(total or 0),
        "data": [
            {
                "id": str(row[0]), "name": row[1], "email": row[2], "role": row[3],
                "is_active": bool(row[4]), "is_verified": bool(row[5]),
                "created_at": row[6].isoformat() if row[6] else None,
                "total_predictions": int(row[7] or 0),
            }
            for row in rows
        ],
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    is_active: bool,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin["id"]:
        raise HTTPException(status_code=400, detail="Admin tidak boleh mengubah status akun sendiri.")

    target = db.execute(
        text("""
            SELECT id, full_name, email, role, is_active, is_verified, created_at
            FROM users WHERE id = :user_id LIMIT 1
        """),
        {"user_id": user_id},
    ).fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    # Untuk keamanan, endpoint status tidak boleh dipakai terhadap akun admin lain.
    if target[3] == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Status akun admin lain tidak dapat diubah melalui endpoint ini.",
        )

    db.execute(
        text("""
            UPDATE users SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
        """),
        {"user_id": user_id, "is_active": is_active},
    )
    db.commit()

    action = "ADMIN_ACTIVATE_USER" if is_active else "ADMIN_DEACTIVATE_USER"
    log_activity(
        db, action,
        f"Admin {'mengaktifkan' if is_active else 'menonaktifkan'} akun pengguna.",
        request=request, user_id=user_id, actor_user_id=current_admin["id"],
        metadata={"target_email": target[2], "new_is_active": is_active},
    )

    return {
        "message": "Status user berhasil diperbarui.",
        "user": {
            "id": str(target[0]), "name": target[1], "email": target[2],
            "role": target[3], "is_active": is_active,
            "is_verified": bool(target[5]),
            "created_at": target[6].isoformat() if target[6] else None,
        },
    }


@router.get("/activity-logs")
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None, max_length=100),
    search: Optional[str] = Query(None, max_length=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    action_value = action.strip().upper() if action and action.strip() else None
    search_value = f"%{search.strip()}%" if search and search.strip() else None

    filters = """
        WHERE (:action IS NULL OR al.action = :action)
          AND (
              :search IS NULL
              OR al.description ILIKE :search
              OR target.full_name ILIKE :search
              OR target.email ILIKE :search
              OR actor.full_name ILIKE :search
              OR actor.email ILIKE :search
          )
    """
    params = {
        "action": action_value, "search": search_value,
        "limit": page_size, "offset": offset,
    }

    total = db.execute(text(f"""
        SELECT COUNT(*)
        FROM activity_logs al
        LEFT JOIN users target ON target.id = al.user_id
        LEFT JOIN users actor ON actor.id = al.actor_user_id
        {filters}
    """), params).scalar()

    rows = db.execute(text(f"""
        SELECT al.id, al.action, al.description, al.ip_address, al.user_agent,
               al.metadata, al.created_at,
               target.id, target.full_name, target.email,
               actor.id, actor.full_name, actor.email
        FROM activity_logs al
        LEFT JOIN users target ON target.id = al.user_id
        LEFT JOIN users actor ON actor.id = al.actor_user_id
        {filters}
        ORDER BY al.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total_value = int(total or 0)
    return {
        "page": page, "page_size": page_size, "total": total_value,
        "total_pages": (total_value + page_size - 1) // page_size,
        "has_more": offset + page_size < total_value,
        "data": [
            {
                "id": int(row[0]), "action": row[1], "description": row[2],
                "ip_address": row[3], "user_agent": row[4],
                "metadata": row[5] or {},
                "created_at": row[6].isoformat() if row[6] else None,
                "target_user": (
                    {"id": str(row[7]), "name": row[8], "email": row[9]}
                    if row[7] else None
                ),
                "actor_user": (
                    {"id": str(row[10]), "name": row[11], "email": row[12]}
                    if row[10] else None
                ),
            }
            for row in rows
        ],
    }

@router.get("/storage-stats")
def get_storage_stats(
        current_admin: dict = Depends(get_current_admin),
        db: Session = Depends(get_db),
    ):
        """
        Mengambil estimasi penggunaan storage aplikasi.

        Nilai dihitung berdasarkan file_size_bytes pada prediction_records.
        Endpoint ini hanya dapat diakses oleh admin.
        """

        storage_limit_gb = float(
            os.getenv("APP_STORAGE_LIMIT_GB", "1")
        )

        storage_limit_bytes = int(
            storage_limit_gb * 1024 * 1024 * 1024
        )

        row = db.execute(
            text("""
                SELECT
                    COUNT(*) AS total_records,
                    COUNT(image_processed_url) AS processed_images,
                    COUNT(image_thumbnail_url) AS thumbnail_images,
                    COALESCE(SUM(file_size_bytes), 0) AS total_file_bytes
                FROM prediction_records
                WHERE image_processed_url IS NOT NULL
                   OR image_thumbnail_url IS NOT NULL
            """)
        ).fetchone()

        total_records = int(row[0] or 0)
        processed_images = int(row[1] or 0)
        thumbnail_images = int(row[2] or 0)
        original_file_bytes = int(row[3] or 0)

        # Estimasi processed image sekitar 60% ukuran upload asli.
        estimated_processed_bytes = int(
            original_file_bytes * 0.60
        )

        # Estimasi thumbnail sekitar 10% ukuran upload asli.
        estimated_thumbnail_bytes = int(
            original_file_bytes * 0.10
        )

        estimated_storage_bytes = (
            estimated_processed_bytes
            + estimated_thumbnail_bytes
        )

        remaining_bytes = max(
            storage_limit_bytes - estimated_storage_bytes,
            0,
        )

        usage_percentage = (
            estimated_storage_bytes / storage_limit_bytes * 100
            if storage_limit_bytes > 0
            else 0
        )

        if usage_percentage >= 95:
            storage_status = "critical"
            storage_message = "Storage hampir mencapai batas."
        elif usage_percentage >= 80:
            storage_status = "warning"
            storage_message = "Storage mulai mendekati batas."
        else:
            storage_status = "safe"
            storage_message = "Penggunaan storage masih aman."

        def bytes_to_mb(value: int) -> float:
            return round(value / (1024 * 1024), 2)

        def bytes_to_gb(value: int) -> float:
            return round(value / (1024 * 1024 * 1024), 3)

        return {
            "status": storage_status,
            "message": storage_message,
            "limit": {
                "bytes": storage_limit_bytes,
                "mb": bytes_to_mb(storage_limit_bytes),
                "gb": storage_limit_gb,
            },
            "usage": {
                "estimated_bytes": estimated_storage_bytes,
                "estimated_mb": bytes_to_mb(
                    estimated_storage_bytes
                ),
                "estimated_gb": bytes_to_gb(
                    estimated_storage_bytes
                ),
                "percentage": round(usage_percentage, 2),
            },
            "remaining": {
                "bytes": remaining_bytes,
                "mb": bytes_to_mb(remaining_bytes),
                "gb": bytes_to_gb(remaining_bytes),
            },
            "files": {
                "prediction_records": total_records,
                "processed_images": processed_images,
                "thumbnail_images": thumbnail_images,
                "total_storage_objects": (
                    processed_images + thumbnail_images
                ),
            },
            "calculation": {
                "source_upload_bytes": original_file_bytes,
                "processed_estimation_ratio": 0.60,
                "thumbnail_estimation_ratio": 0.10,
                "is_estimation": True,
            },
        }    

@router.delete("/storage/cleanup")
def cleanup_old_storage_images(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    candidates = get_oldest_prediction_images(db=db, limit=limit)

    if not candidates:
        return {
            "message": "Tidak ada gambar lama yang perlu dibersihkan.",
            "requested_limit": limit,
            "candidate_records": 0,
            "cleaned_records": 0,
            "deleted_storage_objects": 0,
            "failed_records": [],
        }

    cleaned_record_ids = []
    deleted_paths = []
    failed_records = []

    for item in candidates:
        try:
            storage_result = delete_prediction_images_from_supabase(
                image_processed_url=item.get("image_processed_url"),
                image_thumbnail_url=item.get("image_thumbnail_url"),
            )

            cleared_id = clear_prediction_image_urls(
                db=db,
                record_id=item["id"],
            )
            if not cleared_id:
                raise RuntimeError("Record gagal diperbarui setelah file dihapus.")

            cleaned_record_ids.append(cleared_id)
            deleted_paths.extend(storage_result.get("deleted_paths", []))

        except Exception as error:
            db.rollback()
            failed_records.append({
                "record_id": item["id"],
                "error": str(error),
            })

    log_activity(
        db,
        "ADMIN_STORAGE_CLEANUP",
        "Admin membersihkan gambar prediksi lama dari storage.",
        request=request,
        user_id=current_admin["id"],
        actor_user_id=current_admin["id"],
        metadata={
            "requested_limit": limit,
            "candidate_records": len(candidates),
            "cleaned_records": len(cleaned_record_ids),
            "deleted_storage_objects": len(deleted_paths),
            "failed_records": len(failed_records),
            "cleaned_record_ids": cleaned_record_ids,
        },
    )

    return {
        "message": (
            f"Cleanup selesai. {len(cleaned_record_ids)} record gambar "
            "berhasil dibersihkan tanpa menghapus data prediksi."
        ),
        "requested_limit": limit,
        "candidate_records": len(candidates),
        "cleaned_records": len(cleaned_record_ids),
        "deleted_storage_objects": len(deleted_paths),
        "cleaned_record_ids": cleaned_record_ids,
        "failed_records": failed_records,
    }
