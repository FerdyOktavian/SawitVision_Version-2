🌴 SawitVision AI

SawitVision AI adalah aplikasi berbasis kecerdasan buatan untuk mengklasifikasikan tingkat kematangan buah kelapa sawit dari citra digital. Sistem menggunakan model Convolutional Neural Network (CNN) dengan arsitektur EfficientNetV2S dan menyediakan antarmuka web modern berbasis React serta layanan backend menggunakan FastAPI.

Aplikasi ini dapat menerima gambar dari galeri atau kamera, melakukan prediksi tingkat kematangan, menampilkan confidence dan probabilitas setiap kelas, menyimpan riwayat prediksi, mengelola akun pengguna, serta menyediakan dashboard admin dan log aktivitas.

Catatan: versi React + FastAPI ini merupakan pengembangan lanjutan dari sistem klasifikasi sawit. Implementasi utama dalam skripsi menggunakan Streamlit, sedangkan versi ini dikembangkan sebagai perluasan sistem web yang lebih lengkap.

🔗 Demo Aplikasi

Frontend: https://sawitvisionv2.vercel.app

Backend API: https://sawitvision.up.railway.app

Dokumentasi API: https://sawitvision.up.railway.app/docs

📌 Tujuan Pengembangan

SawitVision AI dikembangkan untuk membantu proses identifikasi awal tingkat kematangan buah kelapa sawit berdasarkan citra. Sistem ini diharapkan dapat:

membantu pengguna mengenali tingkat kematangan buah sawit;

memberikan hasil prediksi secara cepat dan konsisten;

menampilkan confidence dan probabilitas setiap kelas;

menyimpan riwayat prediksi pengguna;

menyediakan rekomendasi awal berdasarkan hasil klasifikasi;

mendukung pengelolaan pengguna melalui dashboard admin.

Hasil prediksi digunakan sebagai alat bantu awal. Keputusan di lapangan tetap perlu mempertimbangkan kondisi buah secara langsung, pencahayaan, jarak pengambilan gambar, sudut kamera, dan pengalaman pengguna.

🧠 Model Artificial Intelligence

Arsitektur Model

Model utama menggunakan EfficientNetV2S, salah satu arsitektur CNN yang dirancang untuk menghasilkan performa tinggi dengan proses pelatihan dan inferensi yang lebih efisien.

Model melakukan klasifikasi ke dalam tiga kelas:

Kelas

Keterangan

belum_masak

Buah kelapa sawit belum mencapai tingkat kematangan optimal

masak

Buah kelapa sawit berada pada tingkat kematangan yang sesuai

terlalu_masak

Buah kelapa sawit telah melewati tingkat kematangan optimal

Dataset

Dataset final terdiri dari 5.353 citra buah kelapa sawit yang telah melalui proses seleksi manual.

Dataset dibagi menjadi tiga kelas:

belum masak;

masak;

terlalu masak.

Hasil Evaluasi Model Final

Metrik

Hasil

Test Accuracy

93,30%

Test Loss

0,1789

Macro F1-score

0,93

Weighted F1-score

0,93

Alur Prediksi

Pengguna memilih atau mengambil gambar.

Gambar dikirim dari frontend ke backend.

Backend memvalidasi format dan isi file.

Gambar diproses sesuai input model.

Model EfficientNetV2S melakukan inferensi.

Sistem menghasilkan kelas prediksi, confidence, probabilitas setiap kelas, dan rekomendasi awal.

Hasil prediksi disimpan ke database jika memenuhi aturan penyimpanan.

Gambar hasil proses dan thumbnail disimpan ke Supabase Storage.

Prediksi dengan confidence rendah dapat tetap ditampilkan kepada pengguna, tetapi tidak disimpan ke riwayat untuk menjaga kualitas data.

🏗️ Arsitektur Sistem

Pengguna
   │
   ▼
React + Vite
Frontend di Vercel
   │
   │ HTTPS REST API
   ▼
FastAPI
Backend di Railway
   │
   ├── EfficientNetV2S / TensorFlow
   ├── Neon PostgreSQL
   ├── Supabase Storage
   └── SendGrid Email API

Penjelasan Komponen

Frontend

Frontend bertanggung jawab untuk:

menampilkan antarmuka aplikasi;

registrasi dan login pengguna;

verifikasi email;

lupa dan reset password;

upload gambar dari galeri;

pengambilan gambar dari kamera;

menampilkan hasil prediksi;

menampilkan riwayat prediksi;

menampilkan profil pengguna;

menyediakan dashboard admin;

mengatur tema terang dan gelap.

Backend

Backend bertanggung jawab untuk:

menyediakan REST API;

autentikasi dan otorisasi pengguna;

validasi token;

validasi gambar;

pemuatan model AI;

preprocessing dan inferensi;

pengelolaan data pengguna;

penyimpanan riwayat prediksi;

integrasi database PostgreSQL;

upload dan penghapusan file pada Supabase Storage;

pengiriman email verifikasi dan reset password;

pengelolaan admin;

pencatatan activity log;

penerapan CORS dan validasi keamanan.

Database

Database PostgreSQL digunakan untuk menyimpan data terstruktur seperti:

akun pengguna;

status verifikasi pengguna;

role pengguna;

riwayat prediksi;

hasil klasifikasi;

confidence dan probabilitas;

URL gambar dan thumbnail;

ukuran file;

waktu prediksi;

log aktivitas sistem.

Object Storage

Supabase Storage digunakan untuk menyimpan file gambar hasil prediksi, seperti gambar hasil proses dan thumbnail. Database hanya menyimpan metadata dan URL file, sedangkan file gambar disimpan di object storage.

Email Service

SendGrid Web API digunakan untuk mengirim email verifikasi akun dan reset password. Layanan ini menggunakan API berbasis HTTPS sehingga tidak bergantung pada port SMTP yang dapat dibatasi oleh platform deployment.

🧰 Teknologi yang Digunakan

Artificial Intelligence

Python

TensorFlow

Keras

EfficientNetV2S

NumPy

Pillow

Computer Vision

Convolutional Neural Network

Backend

FastAPI

Uvicorn

Python

PostgreSQL

JWT Authentication

Passlib / password hashing

Python Multipart

Supabase Python Client

SendGrid Python SDK

Frontend

React

Vite

JavaScript

HTML

CSS

Fetch API

Responsive Web Design

Database dan Storage

Neon PostgreSQL

Supabase Storage

Deployment

Vercel untuk frontend

Railway untuk backend

Hugging Face untuk penyimpanan model berukuran besar

GitHub untuk version control dan source code

✨ Fitur Utama

Fitur Pengguna

registrasi akun;

login akun;

verifikasi email;

lupa password;

reset password;

perubahan password;

menampilkan profil pengguna;

mengambil gambar melalui kamera;

memilih gambar dari galeri;

klasifikasi tingkat kematangan;

hasil confidence;

probabilitas setiap kelas;

rekomendasi berdasarkan prediksi;

riwayat prediksi;

filter riwayat berdasarkan kelas;

penghapusan riwayat;

tema terang dan gelap;

tampilan responsif.

Fitur Admin

login sebagai admin;

melihat daftar pengguna;

melihat status akun pengguna;

mengaktifkan pengguna;

menonaktifkan pengguna;

melihat statistik sistem;

melihat activity log;

mencari dan memfilter activity log;

memantau penggunaan storage;

membersihkan data atau file tertentu sesuai hak akses.

Aktivitas yang Dicatat

REGISTER
LOGIN
LOGIN_FAILED
VERIFY_EMAIL
FORGOT_PASSWORD
RESET_PASSWORD
CHANGE_PASSWORD
CREATE_PREDICTION
DELETE_HISTORY
ADMIN_ACTIVATE_USER
ADMIN_DEACTIVATE_USER

Activity log dapat menyimpan pengguna terkait, actor, alamat IP, user agent, waktu aktivitas, dan metadata tambahan yang aman. Password, JWT, dan token sensitif tidak dicatat ke activity log.

📁 Struktur Proyek

sawitvision/
├── backend/
│   ├── main.py
│   ├── predict.py
│   ├── auth.py
│   ├── auth_routes.py
│   ├── admin_routes.py
│   ├── activity_log.py
│   ├── crud.py
│   ├── database.py
│   ├── storage_supabase.py
│   ├── email_service.py
│   ├── class_names.txt
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── models/
│       └── model_sawit.keras
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── assets/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example
│
├── .gitignore
├── LICENSE
└── README.md

Nama file dapat sedikit berbeda mengikuti versi terbaru repository.

Penjelasan File Backend

File

Fungsi

main.py

Entry point aplikasi FastAPI dan registrasi router

predict.py

Pemuatan model, preprocessing, dan inferensi

auth.py

Autentikasi, hashing password, dan JWT

auth_routes.py

Endpoint register, login, verifikasi, dan reset password

admin_routes.py

Endpoint khusus admin

activity_log.py

Pencatatan aktivitas pengguna dan admin

crud.py

Operasi database

database.py

Konfigurasi koneksi PostgreSQL

storage_supabase.py

Upload, akses, dan hapus file Supabase Storage

email_service.py

Pengiriman email melalui SendGrid

class_names.txt

Daftar nama kelas model

requirements.txt

Daftar dependency Python

Penjelasan File Frontend

File

Fungsi

App.jsx

Komponen utama dan alur tampilan aplikasi

main.jsx

Entry point React

index.html

Template HTML utama

vite.config.js

Konfigurasi Vite

vercel.json

Rewrite route untuk Single Page Application

.env

Konfigurasi alamat backend

⚙️ Instalasi Lokal

1. Clone Repository

git clone https://github.com/USERNAME/NAMA-REPOSITORY.git
cd NAMA-REPOSITORY

Ganti USERNAME dan NAMA-REPOSITORY sesuai repository GitHub.

🐍 Menjalankan Backend

1. Masuk ke Folder Backend

cd backend

2. Buat Virtual Environment

Windows

python -m venv venv
venv\Scripts\activate

Linux atau macOS

python3 -m venv venv
source venv/bin/activate

3. Install Dependency

pip install --upgrade pip
pip install -r requirements.txt

4. Buat File .env

Buat file backend/.env:

APP_NAME=SawitVision AI
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require

SECRET_KEY=ganti_dengan_secret_key_yang_kuat
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

MODEL_PATH=models/model_sawit.keras
MODEL_URL=
CLASS_NAMES_PATH=class_names.txt

SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_KEY=SUPABASE_SERVICE_ROLE_KEY
SUPABASE_BUCKET=sawitvision-images

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=sawitvision.ai@gmail.com
SENDGRID_FROM_NAME=SawitVision AI

MIN_SAVE_CONFIDENCE=70
MAX_UPLOAD_SIZE_MB=10

Jangan menambahkan /rest/v1/ pada SUPABASE_URL. Gunakan URL project dasar seperti https://PROJECT_ID.supabase.co.

5. Siapkan Model

Simpan model pada:

backend/models/model_sawit.keras

Apabila model diunduh ketika backend dijalankan, isi MODEL_URL sesuai URL model yang digunakan.

6. Jalankan Backend

uvicorn main:app --reload

Backend lokal:

http://127.0.0.1:8000

Swagger API:

http://127.0.0.1:8000/docs

⚛️ Menjalankan Frontend

1. Masuk ke Folder Frontend

cd frontend

2. Install Dependency

npm install

3. Buat File .env

Buat file frontend/.env:

VITE_API_BASE_URL=http://127.0.0.1:8000

4. Jalankan Frontend

npm run dev

Frontend lokal biasanya berjalan pada:

http://localhost:5173

5. Build Production

npm run build

Hasil build disimpan pada folder frontend/dist.

🗄️ Konfigurasi Database Neon

Buat project PostgreSQL di Neon.

Salin connection string.

Masukkan ke DATABASE_URL.

Jalankan migration atau query pembuatan tabel yang tersedia di proyek.

Pastikan backend dapat terhubung ke database.

Secara umum, database menyimpan entitas:

users
predictions
activity_logs

Nama tabel sebenarnya mengikuti implementasi pada repository.

🖼️ Konfigurasi Supabase Storage

1. Buat Bucket

sawitvision-images

2. Atur Bucket

Untuk menampilkan gambar secara langsung pada halaman history, bucket dapat diatur sebagai public.

3. Tambahkan Environment Variable

SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_KEY=SUPABASE_SERVICE_ROLE_KEY
SUPABASE_BUCKET=sawitvision-images

Gunakan service_role key hanya pada backend. Jangan memasukkannya ke frontend, source code publik, atau GitHub.

4. Mekanisme Penyimpanan

Backend menerima gambar.

Gambar divalidasi.

Gambar diproses dan dikompresi.

File di-upload ke Supabase Storage.

URL file disimpan ke PostgreSQL.

Frontend membaca URL untuk menampilkan gambar di history.

📧 Konfigurasi SendGrid

1. Verifikasi Sender

Settings
→ Sender Authentication
→ Verify a Single Sender

2. Buat API Key

Settings
→ API Keys
→ Create API Key

Berikan izin:

Mail Send → Full Access

3. Tambahkan Variable

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=sawitvision.ai@gmail.com
SENDGRID_FROM_NAME=SawitVision AI

Single Sender dapat digunakan tanpa domain sendiri, tetapi pengiriman ke folder Primary tidak selalu dapat dijamin. Untuk deliverability yang lebih baik, gunakan domain authentication dengan SPF, DKIM, dan DMARC.

🔐 Autentikasi dan Keamanan

Sistem menggunakan autentikasi berbasis JWT.

Alur Registrasi

Pengguna mengisi nama, email, dan password.

Backend memvalidasi data.

Password di-hash.

Akun disimpan dalam kondisi belum terverifikasi.

Backend mengirim email verifikasi.

Pengguna membuka link.

Akun diaktifkan.

Pengguna dapat login.

Alur Login

Pengguna memasukkan email dan password.

Backend mencocokkan password hash.

Backend memeriksa status verifikasi dan status aktif.

Backend membuat access token.

Token digunakan untuk endpoint yang dilindungi.

Alur Reset Password

Pengguna memasukkan alamat email.

Backend membuat token reset dengan masa berlaku terbatas.

Email reset dikirim.

Pengguna membuka route reset password pada frontend.

Password baru dikirim ke backend.

Backend memvalidasi token dan memperbarui password.

Perlindungan yang Diterapkan

password tidak disimpan dalam bentuk teks biasa;

token sensitif tidak dicatat di activity log;

validasi role admin;

validasi akun aktif;

validasi email terverifikasi;

CORS hanya untuk origin yang diizinkan;

validasi MIME type dan isi gambar;

pembatasan ukuran file;

pembatasan akses endpoint admin;

secret key disimpan sebagai environment variable.

🔌 Endpoint Utama

Detail parameter dapat dilihat melalui Swagger /docs.

Authentication

POST /auth/register
POST /auth/login
GET  /auth/verify-email
GET  /auth/profile
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password

Prediction

POST   /predict
GET    /predictions
DELETE /predictions/{record_id}

Admin

GET   /admin/users
GET   /admin/activity-logs
PATCH /admin/users/{user_id}/status

Contoh filter activity log:

GET /admin/activity-logs?page=1&page_size=20
GET /admin/activity-logs?action=LOGIN
GET /admin/activity-logs?search=ferdy

Nama endpoint sebenarnya dapat mengikuti implementasi terbaru repository.

🚀 Deployment

Deployment Backend ke Railway

Push repository ke GitHub.

Buat project baru di Railway.

Hubungkan repository.

Atur root directory ke backend apabila menggunakan monorepo.

Tambahkan environment variables.

Gunakan start command:

uvicorn main:app --host 0.0.0.0 --port $PORT

Deploy aplikasi.

Uji endpoint /docs.

Dependency TensorFlow Railway

Konfigurasi production yang telah digunakan:

tensorflow-cpu==2.10.1
numpy==1.23.5
protobuf==3.19.6
h5py==3.7.0

Versi dependency harus kompatibel dengan model yang disimpan.

Deployment Frontend ke Vercel

Hubungkan repository GitHub ke Vercel.

Atur root directory ke frontend.

Pilih framework Vite.

Tambahkan environment variable:

VITE_API_BASE_URL=https://sawitvision.up.railway.app

Deploy frontend.

Untuk mendukung route seperti /reset-password dan /verify-email, gunakan frontend/vercel.json:

{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}

CORS Production

CORS_ORIGINS=https://sawitvisionv2.vercel.app,http://localhost:5173

🧪 Pengujian Sistem

Pengujian Backend

Registrasi pengguna baru.

Verifikasi email.

Login menggunakan akun aktif.

Mencoba login dengan password salah.

Upload gambar valid.

Upload file bukan gambar.

Melihat hasil prediksi.

Melihat riwayat.

Menghapus riwayat.

Mencoba endpoint admin sebagai user biasa.

Login sebagai admin.

Melihat daftar pengguna.

Menonaktifkan user.

Melihat activity log.

Melakukan forgot password.

Mereset password.

Login menggunakan password baru.

Pengujian Frontend

halaman dapat dibuka;

kamera dapat digunakan;

galeri dapat dipilih;

preview gambar tampil;

loading prediksi tampil;

hasil prediksi tampil;

confidence tampil;

probabilitas tampil;

history tampil;

gambar history dapat dibuka;

filter history bekerja;

dark mode bekerja;

route reset password tidak menghasilkan 404.

🛠️ Troubleshooting

Gambar History Tidak Muncul

Pastikan:

SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_BUCKET=sawitvision-images

Periksa bahwa:

tidak ada /rest/v1/ pada SUPABASE_URL;

bucket tersedia;

bucket public jika memakai public URL;

service role key benar;

response /predict memiliki URL gambar;

log Railway tidak menunjukkan error upload.

Error 404 Saat Membuka Reset Password

Pastikan frontend/vercel.json tersedia dan melakukan rewrite ke /index.html.

Login Menghasilkan 401

Kemungkinan email atau password salah, access token tidak valid, atau token kedaluwarsa.

Login Menghasilkan 403

Kemungkinan email belum diverifikasi, akun dinonaktifkan, atau user tidak memiliki role yang sesuai.

Email Masuk ke Spam

klik “Not Spam”;

tambahkan sender ke kontak;

gunakan subject sederhana;

hindari isi email yang terlihat seperti promosi;

gunakan domain authentication untuk hasil terbaik.

Model Tidak Ditemukan

Periksa MODEL_PATH dan pastikan file model tersedia atau URL download model dapat diakses.

CORS Error

Periksa CORS_ORIGINS lalu redeploy backend setelah variable diubah.

🔒 Environment Variables yang Tidak Boleh Dipublikasikan

Jangan pernah memasukkan nilai asli berikut ke GitHub:

DATABASE_URL
SECRET_KEY
SUPABASE_KEY
SENDGRID_API_KEY
JWT_SECRET
SERVICE_ROLE_KEY

Tambahkan .env ke .gitignore:

.env
.env.*
!.env.example
venv/
__pycache__/
*.pyc
node_modules/
dist/
models/*.keras

Gunakan .env.example tanpa nilai rahasia untuk dokumentasi.

📊 Batasan Sistem

hasil prediksi bergantung pada kualitas gambar;

pencahayaan yang terlalu gelap atau terlalu terang dapat memengaruhi hasil;

objek yang terlalu jauh dapat menurunkan confidence;

sistem hanya dilatih untuk tiga kelas kematangan;

sistem belum dirancang sebagai pengganti pemeriksaan lapangan;

Single Sender SendGrid belum menjamin email selalu masuk Primary;

gambar yang gagal di-upload tidak dapat ditampilkan pada history;

performa inferensi bergantung pada resource backend.

🗺️ Pengembangan Selanjutnya

deteksi gambar bukan buah kelapa sawit;

peningkatan kualitas dataset;

penambahan data lapangan yang lebih beragam;

object detection untuk buah sawit dalam satu gambar;

visualisasi Grad-CAM;

export laporan prediksi;

dashboard analitik yang lebih lengkap;

domain authentication untuk email;

progressive web app;

integrasi monitoring error;

automated testing dan CI/CD;

optimasi model dengan TensorFlow Lite atau ONNX;

dukungan klasifikasi secara offline.

👨‍💻 Pengembang

Muhammad Ferdy Oktavian

Pengembang aplikasi klasifikasi kematangan buah kelapa sawit menggunakan EfficientNetV2S, React, FastAPI, TensorFlow, PostgreSQL, dan teknologi web modern.

📄 Lisensi

Tambahkan lisensi sesuai kebutuhan repository, misalnya MIT License. Apabila proyek digunakan untuk kebutuhan akademik, penelitian, atau pengembangan lanjutan, cantumkan atribusi kepada pengembang dan repository ini.

🙏 Penutup

SawitVision AI dikembangkan sebagai sistem klasifikasi tingkat kematangan buah kelapa sawit berbasis deep learning. Sistem menggabungkan model EfficientNetV2S, backend FastAPI, frontend React, database PostgreSQL, object storage, dan layanan email menjadi satu aplikasi web yang terintegrasi.
