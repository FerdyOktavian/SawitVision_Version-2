import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_client_ip(request: Optional[Request]) -> Optional[str]:
    """Ambil IP client dengan dukungan reverse proxy."""
    if request is None:
        return None

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:45]

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:45]

    return request.client.host[:45] if request.client else None


def get_user_agent(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    user_agent = request.headers.get("user-agent")
    return user_agent[:500] if user_agent else None


def log_activity(
    db: Session,
    action: str,
    description: str,
    *,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> bool:
    """
    Menyimpan activity log tanpa membuat fitur utama gagal ketika proses logging bermasalah.

    Jangan masukkan password, token JWT, token verifikasi, atau data sensitif lain ke metadata.
    """
    try:
        query = text("""
            INSERT INTO activity_logs (
                user_id,
                actor_user_id,
                action,
                description,
                ip_address,
                user_agent,
                metadata
            )
            VALUES (
                :user_id,
                :actor_user_id,
                :action,
                :description,
                :ip_address,
                :user_agent,
                CAST(:metadata AS JSONB)
            )
        """)

        db.execute(
            query,
            {
                "user_id": user_id,
                "actor_user_id": actor_user_id,
                "action": action.strip().upper()[:100],
                "description": description.strip(),
                "ip_address": get_client_ip(request),
                "user_agent": get_user_agent(request),
                "metadata": json.dumps(metadata or {}, ensure_ascii=False),
            },
        )

        if commit:
            db.commit()

        return True
    except Exception as error:
        db.rollback()
        print(f"Gagal menyimpan activity log [{action}]: {error}")
        return False
