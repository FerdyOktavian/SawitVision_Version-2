import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from activity_log import log_activity
from auth import (
    create_access_token,
    generate_secure_token,
    get_current_user,
    hash_password,
    hash_token,
    verify_password,
)
from database import get_db
from email_service import send_reset_password_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=100)

class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)


def get_user_by_email(db: Session, email: str):
    row = db.execute(
        text("""
            SELECT id, full_name, email, password_hash, role,
                   is_active, is_verified, created_at
            FROM users
            WHERE LOWER(email) = LOWER(:email)
            LIMIT 1
        """),
        {"email": email},
    ).fetchone()

    if not row:
        return None

    return {
        "id": str(row[0]),
        "name": row[1],
        "email": row[2],
        "password_hash": row[3],
        "role": row[4],
        "is_active": bool(row[5]),
        "is_verified": bool(row[6]),
        "created_at": row[7].isoformat() if row[7] else None,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    name = payload.name.strip()

    if get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")

    verification_token = generate_secure_token()
    result = db.execute(
        text("""
            INSERT INTO users (
                full_name, email, password_hash, role, is_active, is_verified,
                verification_token_hash, verification_token_expires_at
            )
            VALUES (
                :full_name, :email, :password_hash, 'user', TRUE, FALSE,
                :verification_token_hash, :verification_token_expires_at
            )
            RETURNING id, full_name, email, role, is_active, is_verified, created_at
        """),
        {
            "full_name": name,
            "email": email,
            "password_hash": hash_password(payload.password),
            "verification_token_hash": hash_token(verification_token),
            "verification_token_expires_at": datetime.utcnow() + timedelta(hours=24),
        },
    ).fetchone()
    db.commit()

    user_id = str(result[0])
    log_activity(
        db, "REGISTER", "Akun pengguna berhasil dibuat.", request=request,
        user_id=user_id, actor_user_id=user_id, metadata={"email": email},
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    verification_link = f"{frontend_url}/verify-email?token={verification_token}"

    try:
        send_verification_email(email, name, verification_link)
    except Exception as error:
        print("Gagal mengirim email verifikasi:", error)
        raise HTTPException(
            status_code=500,
            detail="Akun berhasil dibuat, tetapi email verifikasi gagal dikirim.",
        )

    return {
        "message": "Registrasi berhasil. Silakan cek email untuk verifikasi akun.",
        "user": {
            "id": user_id, "name": result[1], "email": result[2], "role": result[3],
            "is_active": bool(result[4]), "is_verified": bool(result[5]),
            "created_at": result[6].isoformat() if result[6] else None,
        },
    }


@router.post("/login")
def login_user(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = get_user_by_email(db, email)

    if not user or not verify_password(payload.password, user["password_hash"]):
        log_activity(
            db, "LOGIN_FAILED", "Percobaan login gagal.", request=request,
            user_id=user["id"] if user else None,
            actor_user_id=user["id"] if user else None,
            metadata={"email": email, "reason": "invalid_credentials"},
        )
        raise HTTPException(status_code=401, detail="Email atau password salah.")

    if not user["is_active"]:
        log_activity(
            db, "LOGIN_FAILED", "Login ditolak karena akun tidak aktif.", request=request,
            user_id=user["id"], actor_user_id=user["id"],
            metadata={"reason": "inactive_account"},
        )
        raise HTTPException(status_code=403, detail="Akun tidak aktif.")

    if not user["is_verified"]:
        log_activity(
            db, "LOGIN_FAILED", "Login ditolak karena email belum diverifikasi.", request=request,
            user_id=user["id"], actor_user_id=user["id"],
            metadata={"reason": "unverified_email"},
        )
        raise HTTPException(status_code=403, detail="Email belum diverifikasi.")

    access_token = create_access_token({
        "sub": user["id"], "email": user["email"], "role": user["role"]
    })
    log_activity(
        db, "LOGIN", "Pengguna berhasil login.", request=request,
        user_id=user["id"], actor_user_id=user["id"],
    )

    user_data = {key: user[key] for key in (
        "id", "name", "email", "role", "is_active", "is_verified", "created_at"
    )}
    return {
        "message": "Login berhasil.", "access_token": access_token,
        "token_type": "bearer", "user": user_data,
    }


@router.get("/verify-email")
def verify_email(token: str, request: Request, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT id, is_verified, verification_token_expires_at
            FROM users WHERE verification_token_hash = :token_hash LIMIT 1
        """),
        {"token_hash": hash_token(token)},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Token verifikasi tidak valid.")

    user_id, is_verified, expires_at = str(row[0]), bool(row[1]), row[2]
    if is_verified:
        return {"message": "Email sudah berhasil diverifikasi. Silakan login."}
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token verifikasi sudah kedaluwarsa.")

    db.execute(
        text("""
            UPDATE users SET is_verified = TRUE, email_verified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP WHERE id = :user_id
        """),
        {"user_id": user_id},
    )
    db.commit()
    log_activity(
        db, "VERIFY_EMAIL", "Email pengguna berhasil diverifikasi.", request=request,
        user_id=user_id, actor_user_id=user_id,
    )
    return {"message": "Email berhasil diverifikasi. Silakan login."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    safe_response = {"message": "Jika email terdaftar, link reset password akan dikirim."}
    user = get_user_by_email(db, email)

    if not user or not user["is_active"] or not user["is_verified"]:
        return safe_response

    reset_token = generate_secure_token()
    db.execute(
        text("""
            UPDATE users SET reset_password_token_hash = :token_hash,
                reset_password_expires_at = :expires_at, reset_password_used_at = NULL,
                updated_at = CURRENT_TIMESTAMP WHERE id = :user_id
        """),
        {
            "token_hash": hash_token(reset_token),
            "expires_at": datetime.utcnow() + timedelta(minutes=30),
            "user_id": user["id"],
        },
    )
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    try:
        send_reset_password_email(
            email, user["name"], f"{frontend_url}/reset-password?token={reset_token}"
        )
    except Exception as error:
        print("Gagal mengirim email reset password:", error)
        raise HTTPException(status_code=500, detail="Email reset password gagal dikirim.")

    log_activity(
        db, "FORGOT_PASSWORD", "Permintaan reset password berhasil dibuat.",
        request=request, user_id=user["id"], actor_user_id=user["id"],
    )
    return safe_response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT id, reset_password_expires_at, reset_password_used_at
            FROM users WHERE reset_password_token_hash = :token_hash LIMIT 1
        """),
        {"token_hash": hash_token(payload.token)},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Token reset password tidak valid.")
    user_id, expires_at, used_at = str(row[0]), row[1], row[2]
    if used_at is not None:
        raise HTTPException(status_code=400, detail="Token reset password sudah digunakan.")
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token reset password sudah kedaluwarsa.")

    db.execute(
        text("""
            UPDATE users SET password_hash = :password_hash,
                reset_password_token_hash = NULL, reset_password_expires_at = NULL,
                reset_password_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
        """),
        {"password_hash": hash_password(payload.new_password), "user_id": user_id},
    )
    db.commit()
    log_activity(
        db, "RESET_PASSWORD", "Password berhasil diubah melalui link reset.",
        request=request, user_id=user_id, actor_user_id=user_id,
    )
    return {"message": "Password berhasil diubah. Silakan login menggunakan password baru."}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("SELECT id, password_hash FROM users WHERE id = :user_id LIMIT 1"),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    if not verify_password(payload.old_password, row[1]):
        raise HTTPException(status_code=400, detail="Password lama tidak sesuai.")
    if verify_password(payload.new_password, row[1]):
        raise HTTPException(status_code=400, detail="Password baru tidak boleh sama dengan password lama.")

    db.execute(
        text("""
            UPDATE users SET password_hash = :password_hash,
                updated_at = CURRENT_TIMESTAMP WHERE id = :user_id
        """),
        {"password_hash": hash_password(payload.new_password), "user_id": current_user["id"]},
    )
    db.commit()
    log_activity(
        db, "CHANGE_PASSWORD", "Pengguna mengubah password dari halaman profil.",
        request=request, user_id=current_user["id"], actor_user_id=current_user["id"],
    )
    return {"message": "Password berhasil diubah."}


@router.patch("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mengubah nama dan email pengguna.

    Jika email berubah:
    - email harus belum digunakan akun lain,
    - status verifikasi kembali menjadi false,
    - link verifikasi dikirim ke email baru.
    """

    new_name = payload.name.strip()
    new_email = payload.email.lower().strip()
    current_email = current_user["email"].lower().strip()

    email_changed = new_email != current_email

    # Cek apakah email baru sudah dipakai akun lain
    if email_changed:
        existing_email = db.execute(
            text("""
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER(:email)
                AND id != :user_id
                LIMIT 1
            """),
            {
                "email": new_email,
                "user_id": current_user["id"],
            },
        ).fetchone()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email sudah digunakan oleh akun lain.",
            )

    verification_token = None
    verification_token_hash = None
    verification_expires_at = None

    if email_changed:
        verification_token = generate_secure_token()
        verification_token_hash = hash_token(verification_token)
        verification_expires_at = datetime.utcnow() + timedelta(hours=24)

    query = text("""
        UPDATE users
        SET
            full_name = :full_name,
            email = :email,
            is_verified = CASE
                WHEN :email_changed = TRUE THEN FALSE
                ELSE is_verified
            END,
            email_verified_at = CASE
                WHEN :email_changed = TRUE THEN NULL
                ELSE email_verified_at
            END,
            verification_token_hash = CASE
                WHEN :email_changed = TRUE THEN :verification_token_hash
                ELSE verification_token_hash
            END,
            verification_token_expires_at = CASE
                WHEN :email_changed = TRUE THEN :verification_expires_at
                ELSE verification_token_expires_at
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :user_id
        RETURNING
            id,
            full_name,
            email,
            role,
            is_active,
            is_verified,
            created_at
    """)

    row = db.execute(
        query,
        {
            "full_name": new_name,
            "email": new_email,
            "email_changed": email_changed,
            "verification_token_hash": verification_token_hash,
            "verification_expires_at": verification_expires_at,
            "user_id": current_user["id"],
        },
    ).fetchone()

    db.commit()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan.",
        )

    # Kirim email verifikasi hanya jika email berubah
    if email_changed:
        frontend_url = os.getenv(
            "FRONTEND_URL",
            "http://localhost:5173",
        )

        verification_link = (
            f"{frontend_url}/verify-email?token={verification_token}"
        )

        try:
            send_verification_email(
                to_email=new_email,
                name=new_name,
                verification_link=verification_link,
            )
        except Exception as email_error:
            print(
                "Profil berhasil diperbarui, tetapi email verifikasi gagal:",
                email_error,
            )

            return {
                "message": (
                    "Profil berhasil diperbarui, tetapi email "
                    "verifikasi gagal dikirim."
                ),
                "email_changed": True,
                "verification_email_sent": False,
            }

    return {
        "message": (
            "Profil berhasil diperbarui. Silakan verifikasi email baru."
            if email_changed
            else "Profil berhasil diperbarui."
        ),
        "email_changed": email_changed,
        "verification_email_sent": email_changed,
        "user": {
            "id": str(row[0]),
            "name": row[1],
            "email": row[2],
            "role": row[3],
            "is_active": bool(row[4]),
            "is_verified": bool(row[5]),
            "created_at": row[6].isoformat() if row[6] else None,
        },
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}
