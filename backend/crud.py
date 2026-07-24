from sqlalchemy import text


def get_active_model_version(db):
    query = text("""
        SELECT id
        FROM model_versions
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
    """)

    result = db.execute(query).fetchone()

    if result:
        return result[0]

    return None


def save_prediction_record(
    db,
    predicted_class,
    confidence,
    probabilities,
    user_id=None,
    image_original_url=None,
    image_processed_url=None,
    image_thumbnail_url=None,
    input_source="unknown",
    image_width=None,
    image_height=None,
    file_size_bytes=None,
    device_info=None,
    notes=None,
):
    model_version_id = get_active_model_version(db)

    query = text("""
        INSERT INTO prediction_records (
            model_version_id,
            user_id,
            image_original_url,
            image_processed_url,
            image_thumbnail_url,
            predicted_class,
            confidence,
            prob_belum_masak,
            prob_masak,
            prob_terlalu_masak,
            input_source,
            image_width,
            image_height,
            file_size_bytes,
            device_info,
            notes
        )
        VALUES (
            :model_version_id,
            :user_id,
            :image_original_url,
            :image_processed_url,
            :image_thumbnail_url,
            :predicted_class,
            :confidence,
            :prob_belum_masak,
            :prob_masak,
            :prob_terlalu_masak,
            :input_source,
            :image_width,
            :image_height,
            :file_size_bytes,
            :device_info,
            :notes
        )
        RETURNING id, created_at
    """)

    result = db.execute(
        query,
        {
            "model_version_id": model_version_id,
            "user_id": user_id,
            "image_original_url": image_original_url,
            "image_processed_url": image_processed_url,
            "image_thumbnail_url": image_thumbnail_url,
            "predicted_class": predicted_class,
            "confidence": float(confidence),
            "prob_belum_masak": float(probabilities.get("belum_masak", 0)),
            "prob_masak": float(probabilities.get("masak", 0)),
            "prob_terlalu_masak": float(probabilities.get("terlalu_masak", 0)),
            "input_source": input_source,
            "image_width": image_width,
            "image_height": image_height,
            "file_size_bytes": file_size_bytes,
            "device_info": device_info,
            "notes": notes,
        },
    ).fetchone()

    db.commit()

    return {
        "id": str(result[0]),
        "created_at": result[1],
    }

def get_prediction_records(db, user_id=None, limit=20, offset=0):
    if user_id:
        query = text("""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM prediction_records
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit
            OFFSET :offset
        """)

        params = {
            "user_id": user_id,
            "limit": limit,
            "offset": offset,
        }

    else:
        query = text("""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM prediction_records
            ORDER BY created_at DESC
            LIMIT :limit
            OFFSET :offset
        """)

        params = {
            "limit": limit,
            "offset": offset,
        }

    rows = db.execute(query, params).fetchall()

    return [
        {
            "id": str(row[0]),
            "image_processed_url": row[1],
            "image_thumbnail_url": row[2],
            "predicted_class": row[3],
            "confidence": float(row[4]),
            "probabilities": {
                "belum_masak": float(row[5]),
                "masak": float(row[6]),
                "terlalu_masak": float(row[7]),
            },
            "input_source": row[8],
            "image_width": row[9],
            "image_height": row[10],
            "file_size_bytes": row[11],
            "created_at": row[12].isoformat() if row[12] else None,
        }
        for row in rows
    ]


def count_prediction_records(db):
    query = text("""
        SELECT COUNT(*)
        FROM prediction_records
    """)

    total = db.execute(query).scalar()
    return int(total or 0)


def get_prediction_record_by_id(db, record_id, user_id=None):
    if user_id:
        query = text("""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM prediction_records
            WHERE id = :record_id
            AND user_id = :user_id
            LIMIT 1
        """)

        params = {
            "record_id": record_id,
            "user_id": user_id,
        }

    else:
        query = text("""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM prediction_records
            WHERE id = :record_id
            LIMIT 1
        """)

        params = {
            "record_id": record_id,
        }

    row = db.execute(query, params).fetchone()

    if not row:
        return None

    return {
        "id": str(row[0]),
        "image_processed_url": row[1],
        "image_thumbnail_url": row[2],
        "predicted_class": row[3],
        "confidence": float(row[4]),
        "probabilities": {
            "belum_masak": float(row[5]),
            "masak": float(row[6]),
            "terlalu_masak": float(row[7]),
        },
        "input_source": row[8],
        "image_width": row[9],
        "image_height": row[10],
        "file_size_bytes": row[11],
        "created_at": row[12].isoformat() if row[12] else None,
    }

def get_prediction_stats(db, user_id=None):
    if user_id:
        query_total = text("""
            SELECT COUNT(*)
            FROM prediction_records
            WHERE user_id = :user_id
        """)

        query_by_class = text("""
            SELECT
                predicted_class,
                COUNT(*) AS total,
                AVG(confidence) AS avg_confidence
            FROM prediction_records
            WHERE user_id = :user_id
            GROUP BY predicted_class
            ORDER BY total DESC
        """)

        params = {"user_id": user_id}

    else:
        query_total = text("""
            SELECT COUNT(*)
            FROM prediction_records
        """)

        query_by_class = text("""
            SELECT
                predicted_class,
                COUNT(*) AS total,
                AVG(confidence) AS avg_confidence
            FROM prediction_records
            GROUP BY predicted_class
            ORDER BY total DESC
        """)

        params = {}

    total = db.execute(query_total, params).scalar()
    rows = db.execute(query_by_class, params).fetchall()

    by_class = {}

    for row in rows:
        by_class[row[0]] = {
            "total": int(row[1]),
            "avg_confidence": round(float(row[2]), 2) if row[2] else 0,
        }

    return {
        "total_predictions": int(total or 0),
        "by_class": by_class,
    }

def update_prediction_images(
    db,
    record_id,
    image_processed_url=None,
    image_thumbnail_url=None,
):
    query = text("""
        UPDATE prediction_records
        SET
            image_processed_url = :image_processed_url,
            image_thumbnail_url = :image_thumbnail_url
        WHERE id = :record_id
    """)

    db.execute(
        query,
        {
            "record_id": record_id,
            "image_processed_url": image_processed_url,
            "image_thumbnail_url": image_thumbnail_url,
        },
    )

    db.commit()
def delete_prediction_record(db, record_id):
    query = text("""
        DELETE FROM prediction_records
        WHERE id = :record_id
        RETURNING id
    """)

    result = db.execute(
        query,
        {
            "record_id": record_id,
        },
    ).fetchone()

    db.commit()

    if result:
        return str(result[0])

    return None

def get_estimated_storage_usage(db):
    """
    Menghitung estimasi penggunaan storage berdasarkan ukuran file upload.

    Estimasi:
    - processed image = 60% ukuran asli
    - thumbnail = 10% ukuran asli
    """

    query = text("""
        SELECT COALESCE(SUM(file_size_bytes), 0)
        FROM prediction_records
        WHERE image_processed_url IS NOT NULL
           OR image_thumbnail_url IS NOT NULL
    """)

    original_bytes = int(db.execute(query).scalar() or 0)

    estimated_processed_bytes = int(original_bytes * 0.60)
    estimated_thumbnail_bytes = int(original_bytes * 0.10)

    return estimated_processed_bytes + estimated_thumbnail_bytes

def get_oldest_prediction_images(db, limit=10):
    query = text("""
        SELECT id, image_processed_url, image_thumbnail_url,
               predicted_class, created_at
        FROM prediction_records
        WHERE image_processed_url IS NOT NULL
           OR image_thumbnail_url IS NOT NULL
        ORDER BY created_at ASC
        LIMIT :limit
    """)
    rows = db.execute(query, {"limit": limit}).fetchall()
    return [
        {
            "id": str(row[0]),
            "image_processed_url": row[1],
            "image_thumbnail_url": row[2],
            "predicted_class": row[3],
            "created_at": row[4].isoformat() if row[4] else None,
        }
        for row in rows
    ]


def clear_prediction_image_urls(db, record_id):
    result = db.execute(
        text("""
            UPDATE prediction_records
            SET image_original_url = NULL,
                image_processed_url = NULL,
                image_thumbnail_url = NULL
            WHERE id = :record_id
            RETURNING id
        """),
        {"record_id": record_id},
    ).fetchone()
    db.commit()
    return str(result[0]) if result else None
