import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SawitVision AI")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)


def send_email(to_email: str, subject: str, html_body: str):
    """
    Mengirim email HTML menggunakan SMTP Brevo.

    Catatan:
    - SMTP_USER diisi SMTP Login dari Brevo.
    - SMTP_PASSWORD diisi SMTP Key dari Brevo.
    - SMTP_FROM_EMAIL harus sender yang sudah diverifikasi di Brevo.
    """

    if not SMTP_USER:
        raise ValueError("SMTP_USER belum diset di file .env")

    if not SMTP_PASSWORD:
        raise ValueError("SMTP_PASSWORD belum diset di file .env")

    if not SMTP_FROM_EMAIL:
        raise ValueError("SMTP_FROM_EMAIL belum diset di file .env")

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    message["To"] = to_email

    html_part = MIMEText(html_body, "html")
    message.attach(html_part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, to_email, message.as_string())


def send_verification_email(to_email: str, name: str, verification_link: str):
    """
    Template email verifikasi akun.
    """

    subject = "Verifikasi Akun SawitVision AI"

    html_body = f"""
    <html>
      <body style="margin:0; padding:0; background:#f7f2e8; font-family:Arial, sans-serif;">
        <div style="max-width:620px; margin:0 auto; padding:28px;">
          <div style="background:#ffffff; border-radius:22px; padding:28px; border:1px solid #ead8bd;">
            <div style="font-size:42px;">🌴</div>

            <h2 style="color:#24351f; margin-bottom:8px;">
              Verifikasi Akun SawitVision AI
            </h2>

            <p style="color:#5f513f; line-height:1.6;">
              Halo <b>{name}</b>,
            </p>

            <p style="color:#5f513f; line-height:1.6;">
              Terima kasih sudah mendaftar di SawitVision AI.
              Untuk mengaktifkan akun kamu, silakan klik tombol di bawah ini.
            </p>

            <div style="margin:28px 0;">
              <a href="{verification_link}"
                 style="display:inline-block; background:#2f7d32; color:#ffffff;
                        text-decoration:none; padding:14px 22px; border-radius:14px;
                        font-weight:bold;">
                Verifikasi Akun
              </a>
            </div>

            <p style="color:#7a6a55; line-height:1.6; font-size:14px;">
              Link ini hanya berlaku dalam waktu tertentu. Kalau kamu tidak merasa mendaftar,
              abaikan email ini.
            </p>

            <hr style="border:none; border-top:1px solid #ead8bd; margin:24px 0;" />

            <p style="color:#9a8a73; font-size:12px; line-height:1.5;">
              Email ini dikirim otomatis oleh sistem SawitVision AI.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    send_email(to_email=to_email, subject=subject, html_body=html_body)

def send_reset_password_email(to_email: str, name: str, reset_link: str):
    """
    Template email reset password.
    Email ini dikirim saat user meminta lupa password.
    """

    subject = "Reset Password Akun SawitVision AI"

    html_body = f"""
    <html>
      <body style="margin:0; padding:0; background:#f7f2e8; font-family:Arial, sans-serif;">
        <div style="max-width:620px; margin:0 auto; padding:28px;">
          <div style="background:#ffffff; border-radius:22px; padding:28px; border:1px solid #ead8bd;">
            <div style="font-size:42px;">🔐</div>

            <h2 style="color:#24351f; margin-bottom:8px;">
              Reset Password SawitVision AI
            </h2>

            <p style="color:#5f513f; line-height:1.6;">
              Halo <b>{name}</b>,
            </p>

            <p style="color:#5f513f; line-height:1.6;">
              Kami menerima permintaan untuk mengatur ulang password akun kamu.
              Klik tombol di bawah ini untuk membuat password baru.
            </p>

            <div style="margin:28px 0;">
              <a href="{reset_link}"
                 style="display:inline-block; background:#2f7d32; color:#ffffff;
                        text-decoration:none; padding:14px 22px; border-radius:14px;
                        font-weight:bold;">
                Reset Password
              </a>
            </div>

            <p style="color:#7a6a55; line-height:1.6; font-size:14px;">
              Link ini hanya berlaku selama 30 menit. Jika kamu tidak meminta reset password,
              abaikan email ini dan password kamu tidak akan berubah.
            </p>

            <hr style="border:none; border-top:1px solid #ead8bd; margin:24px 0;" />

            <p style="color:#9a8a73; font-size:12px; line-height:1.5;">
              Email ini dikirim otomatis oleh sistem SawitVision AI.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    send_email(to_email=to_email, subject=subject, html_body=html_body)