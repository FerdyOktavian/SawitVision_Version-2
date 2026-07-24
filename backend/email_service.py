import os
from html import escape
from typing import Any

import resend
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_NAME = os.getenv("RESEND_FROM_NAME", "SawitVision AI")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")


def _get_response_id(response: Any):
    if response is None:
        return None
    if isinstance(response, dict):
        return response.get("id")
    return getattr(response, "id", None)


def send_email(to_email: str, subject: str, html_body: str):
    if not RESEND_API_KEY:
        raise ValueError("RESEND_API_KEY belum diset di environment Railway.")

    if not RESEND_FROM_EMAIL:
        raise ValueError("RESEND_FROM_EMAIL belum diset di environment Railway.")

    if not to_email or "@" not in to_email:
        raise ValueError("Alamat email penerima tidak valid.")

    resend.api_key = RESEND_API_KEY

    try:
        params: resend.Emails.SendParams = {
            "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }

        response = resend.Emails.send(params)

        return {
            "success": True,
            "email_id": _get_response_id(response),
            "provider": "resend",
        }
    except Exception as error:
        raise RuntimeError(
            f"Gagal mengirim email melalui Resend: {error}"
        ) from error


def send_verification_email(to_email: str, name: str, verification_link: str):
    safe_name = escape(name or "Pengguna")
    safe_link = escape(verification_link, quote=True)

    subject = "Verifikasi Akun SawitVision AI"

    html_body = f"""
    <!doctype html>
    <html lang="id">
      <body style="margin:0;padding:0;background:#f7f2e8;font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:28px;">
          <div style="background:#fff;border-radius:22px;padding:28px;border:1px solid #ead8bd;">
            <div style="font-size:42px;">🌴</div>
            <h2 style="color:#24351f;margin-bottom:8px;">Verifikasi Akun SawitVision AI</h2>
            <p style="color:#5f513f;line-height:1.6;">Halo <b>{safe_name}</b>,</p>
            <p style="color:#5f513f;line-height:1.6;">
              Terima kasih sudah mendaftar di SawitVision AI.
              Klik tombol di bawah ini untuk mengaktifkan akun kamu.
            </p>
            <div style="margin:28px 0;">
              <a href="{safe_link}"
                 style="display:inline-block;background:#2f7d32;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:bold;">
                Verifikasi Akun
              </a>
            </div>
            <p style="color:#7a6a55;line-height:1.6;font-size:14px;">
              Jika tombol tidak dapat dibuka, salin tautan berikut:
            </p>
            <p style="word-break:break-all;color:#2f7d32;font-size:13px;">{safe_link}</p>
            <p style="color:#7a6a55;line-height:1.6;font-size:14px;">
              Jika kamu tidak merasa mendaftar, abaikan email ini.
            </p>
            <hr style="border:none;border-top:1px solid #ead8bd;margin:24px 0;" />
            <p style="color:#9a8a73;font-size:12px;line-height:1.5;">
              Email ini dikirim otomatis oleh sistem SawitVision AI.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    return send_email(to_email, subject, html_body)


def send_reset_password_email(to_email: str, name: str, reset_link: str):
    safe_name = escape(name or "Pengguna")
    safe_link = escape(reset_link, quote=True)

    subject = "Reset Password Akun SawitVision AI"

    html_body = f"""
    <!doctype html>
    <html lang="id">
      <body style="margin:0;padding:0;background:#f7f2e8;font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:28px;">
          <div style="background:#fff;border-radius:22px;padding:28px;border:1px solid #ead8bd;">
            <div style="font-size:42px;">🔐</div>
            <h2 style="color:#24351f;margin-bottom:8px;">Reset Password SawitVision AI</h2>
            <p style="color:#5f513f;line-height:1.6;">Halo <b>{safe_name}</b>,</p>
            <p style="color:#5f513f;line-height:1.6;">
              Kami menerima permintaan untuk mengatur ulang password akun kamu.
              Klik tombol di bawah ini untuk membuat password baru.
            </p>
            <div style="margin:28px 0;">
              <a href="{safe_link}"
                 style="display:inline-block;background:#2f7d32;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:bold;">
                Reset Password
              </a>
            </div>
            <p style="color:#7a6a55;line-height:1.6;font-size:14px;">
              Jika tombol tidak dapat dibuka, salin tautan berikut:
            </p>
            <p style="word-break:break-all;color:#2f7d32;font-size:13px;">{safe_link}</p>
            <p style="color:#7a6a55;line-height:1.6;font-size:14px;">
              Link ini hanya berlaku selama 30 menit. Jika kamu tidak meminta
              reset password, abaikan email ini.
            </p>
            <hr style="border:none;border-top:1px solid #ead8bd;margin:24px 0;" />
            <p style="color:#9a8a73;font-size:12px;line-height:1.5;">
              Email ini dikirim otomatis oleh sistem SawitVision AI.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    return send_email(to_email, subject, html_body)