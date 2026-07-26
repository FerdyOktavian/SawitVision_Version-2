import { useEffect, useRef, useState } from "react";
import "./App.css";

const BASE_API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const LOGIN_API_URL = `${BASE_API_URL}/auth/login`;
const REGISTER_API_URL = `${BASE_API_URL}/auth/register`;
const ME_API_URL = `${BASE_API_URL}/auth/me`;
const VERIFY_EMAIL_API_URL = `${BASE_API_URL}/auth/verify-email`;
const FORGOT_PASSWORD_API_URL = `${BASE_API_URL}/auth/forgot-password`;
const RESET_PASSWORD_API_URL = `${BASE_API_URL}/auth/reset-password`;
const CHANGE_PASSWORD_API_URL = `${BASE_API_URL}/auth/change-password`;
const UPDATE_PROFILE_API_URL = `${BASE_API_URL}/auth/profile`;
const ADMIN_STATS_API_URL = `${BASE_API_URL}/admin/stats`;
const ADMIN_USERS_API_URL = `${BASE_API_URL}/admin/users`;
const ADMIN_STORAGE_API_URL = `${BASE_API_URL}/admin/storage-stats`;
const ADMIN_STORAGE_CLEANUP_API_URL = `${BASE_API_URL}/admin/storage/cleanup`;
const ADMIN_ACTIVITY_LOGS_API_URL = `${BASE_API_URL}/admin/activity-logs`;
const API_URL = `${BASE_API_URL}/predict`;
const HISTORY_PAGE_SIZE = 10;
const STATS_API_URL = `${BASE_API_URL}/stats`;
const MAX_ZOOM = 5;

const formatApiError = (detail, fallbackMessage) => {
  if (!detail) return fallbackMessage;

  if (typeof detail === "string") {
    const normalized = detail.trim();

    if (
      normalized.toLowerCase() === "internal server error" ||
      normalized.toLowerCase().includes("internal server error")
    ) {
      return `${fallbackMessage} Server sedang mengalami gangguan. Silakan coba lagi.`;
    }

    return normalized;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.msg === "string") return item.msg;
        if (item && typeof item.message === "string") return item.message;
        return null;
      })
      .filter(Boolean);

    return messages.length > 0 ? messages.join(", ") : fallbackMessage;
  }

  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.detail === "string") return detail.detail;
  }

  return fallbackMessage;
};

const getFriendlyErrorMessage = (error, fallbackMessage) => {
  const rawMessage =
    typeof error?.message === "string" ? error.message.trim() : "";

  if (
    !rawMessage ||
    rawMessage === "[object Object]" ||
    rawMessage.toLowerCase() === "internal server error"
  ) {
    return fallbackMessage;
  }

  if (
    rawMessage.toLowerCase().includes("failed to fetch") ||
    rawMessage.toLowerCase().includes("networkerror") ||
    rawMessage.toLowerCase().includes("network request failed")
  ) {
    return "Tidak dapat terhubung ke server. Pastikan backend aktif dan koneksi internet tersedia.";
  }

  return rawMessage;
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // =====================
  // STATE AUTENTIKASI USER
  // =====================
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem("sawitAuthToken") || "";
    } catch {
      return "";
    }
  });

  // State khusus untuk halaman verifikasi email dari link Gmail.
  const [emailVerification, setEmailVerification] = useState({
    status: "idle",
    message: "",
  });

  // State untuk fitur lupa password.
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // State untuk halaman reset password dari link Gmail.
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState("idle");
  const [resetMessage, setResetMessage] = useState("");

  // State untuk fitur profile: ubah password saat user sudah login.
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // State untuk halaman admin dashboard.
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminActionLoadingId, setAdminActionLoadingId] = useState(null);
  const [adminStorage, setAdminStorage] = useState(null);
  const [adminStorageLoading, setAdminStorageLoading] = useState(false);
  const [adminStorageCleanupLimit, setAdminStorageCleanupLimit] = useState(10);
  const [adminStorageCleanupLoading, setAdminStorageCleanupLoading] =
    useState(false);
  const [adminStorageCleanupMessage, setAdminStorageCleanupMessage] =
    useState("");
  const [adminStorageCleanupError, setAdminStorageCleanupError] = useState("");

  // State untuk activity log admin.
  const [adminActivityLogs, setAdminActivityLogs] = useState([]);
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);
  const [adminActivityLoadingMore, setAdminActivityLoadingMore] =
    useState(false);
  const [adminActivityError, setAdminActivityError] = useState("");
  const [adminActivityPage, setAdminActivityPage] = useState(1);
  const [adminActivityTotalPages, setAdminActivityTotalPages] = useState(1);
  const [adminActivityHasMore, setAdminActivityHasMore] = useState(false);
  const [adminActivityFilter, setAdminActivityFilter] = useState("");
  const [adminActivitySearchInput, setAdminActivitySearchInput] = useState("");
  const [adminActivitySearch, setAdminActivitySearch] = useState("");

  // =====================
  // STATE UTAMA APLIKASI
  // =====================
  const [activeTab, setActiveTab] = useState("home");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("sawitTheme") || "light";
    } catch {
      return "light";
    }
  });
  const [mode, setMode] = useState("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");
  const [zoom, setZoom] = useState(1);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [lowConfidence, setLowConfidence] = useState(null);

  // =====================
  // STATE HISTORY DATABASE
  // =====================
  const [dbHistory, setDbHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");

  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [history, setHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("sawitPredictionHistory");
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Gagal membaca history:", error);
      localStorage.removeItem("sawitPredictionHistory");
      return [];
    }
  });

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      try {
        localStorage.setItem("sawitTheme", nextTheme);
      } catch (error) {
        console.warn("Tema gagal disimpan:", error);
      }

      return nextTheme;
    });
  };

  const getClassInfo = (className) => {
    const info = {
      belum_masak: {
        title: "Belum Masak",
        status: "Belum disarankan panen",
        color: "green",
        description:
          "Buah masih berada pada tahap awal kematangan. Sebaiknya lakukan pemantauan ulang sebelum dipanen.",
        reason:
          "Biasanya ditandai warna buah yang masih cenderung gelap, belum banyak warna oranye/merah, dan ciri kematangan belum terlihat kuat.",
        action:
          "Ambil foto ulang beberapa hari kemudian atau tunggu sampai warna buah lebih matang.",
        fruitInfo: [
          "Warna buah masih dominan gelap",
          "Tingkat kematangan belum optimal",
          "Belum direkomendasikan untuk panen",
          "Potensi rendemen minyak belum maksimal",
        ],
        icon: "🟢",
      },
      masak: {
        title: "Masak",
        status: "Siap panen",
        color: "orange",
        description:
          "Buah berada pada tingkat kematangan yang baik dan lebih sesuai untuk proses panen.",
        reason:
          "Model membaca ciri visual buah yang sudah cukup matang, seperti perubahan warna yang lebih jelas dan pola kematangan yang lebih stabil.",
        action:
          "Buah dapat diprioritaskan untuk dipanen apabila kondisi lapangan juga mendukung.",
        fruitInfo: [
          "Tingkat kematangan optimal",
          "Direkomendasikan untuk panen",
          "Potensi kualitas minyak baik",
          "Risiko kehilangan hasil rendah",
        ],
        icon: "🟠",
      },
      terlalu_masak: {
        title: "Terlalu Masak",
        status: "Melewati kematangan optimal",
        color: "red",
        description:
          "Buah sudah melewati kondisi matang optimal. Perlu segera ditangani agar kualitas hasil tidak menurun.",
        reason:
          "Biasanya ditandai warna buah yang lebih tua/terang, tekstur lebih matang, atau adanya indikasi buah sudah melewati fase optimal.",
        action:
          "Segera lakukan penanganan agar kualitas hasil tidak semakin menurun.",
        fruitInfo: [
          "Buah melewati fase optimal",
          "Risiko kehilangan hasil meningkat",
          "Kualitas panen dapat menurun",
          "Perlu segera ditangani",
        ],
        icon: "🔴",
      },
    };

    return (
      info[className] || {
        title: className || "Tidak Diketahui",
        status: "Hasil terdeteksi",
        color: "green",
        description: "Sistem berhasil membaca hasil klasifikasi gambar.",
        reason: "Model memilih kelas dengan probabilitas tertinggi.",
        action: "Gunakan hasil ini sebagai bantuan awal.",
        fruitInfo: ["Hasil prediksi berhasil diproses oleh sistem."],
        icon: "📌",
      }
    );
  };

  const getConfidenceStatus = (confidence) => {
    if (confidence >= 90) return "Sangat yakin";
    if (confidence >= 75) return "Cukup yakin";
    return "Perlu dicek ulang";
  };

  const getHistoryStats = () => {
    const stats = {
      belum_masak: 0,
      masak: 0,
      terlalu_masak: 0,
    };

    dbHistory.forEach((item) => {
      if (stats[item.predicted_class] !== undefined) {
        stats[item.predicted_class] += 1;
      }
    });

    return stats;
  };

  // Header Authorization dipakai untuk semua request yang wajib login.
  const getAuthHeaders = () => {
    if (!authToken) return {};

    return {
      Authorization: `Bearer ${authToken}`,
    };
  };

  // Mengecek apakah user sedang membuka link /verify-email?token=... dari Gmail.
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const isVerifyEmailPage = currentUrl.pathname.includes("verify-email");
    const token = currentUrl.searchParams.get("token");

    if (!isVerifyEmailPage) return;

    if (!token) {
      setEmailVerification({
        status: "error",
        message: "Token verifikasi tidak ditemukan di URL.",
      });
      setAuthChecking(false);
      return;
    }

    const verifyEmail = async () => {
      setEmailVerification({
        status: "loading",
        message: "Sedang memverifikasi email kamu...",
      });

      try {
        const response = await fetch(
          `${VERIFY_EMAIL_API_URL}?token=${encodeURIComponent(token)}`,
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          // Kalau backend tidak mengirim JSON, tetap pakai pesan default.
        }

        if (!response.ok) {
          throw new Error(
            formatApiError(data.detail, "Verifikasi email gagal."),
          );
        }

        // Setelah email valid, hapus token lama di frontend agar user login ulang.
        localStorage.removeItem("sawitAuthToken");
        localStorage.removeItem("sawitUser");
        setAuthToken("");
        setCurrentUser(null);

        setEmailVerification({
          status: "success",
          message:
            data.message || "Email berhasil diverifikasi. Silakan login.",
        });
      } catch (error) {
        setEmailVerification({
          status: "error",
          message: error.message || "Verifikasi email gagal.",
        });
      } finally {
        setAuthChecking(false);
      }
    };

    verifyEmail();
  }, []);

  // Cek token dari localStorage saat aplikasi pertama dibuka.
  // Kalau token masih valid, user langsung masuk tanpa login ulang.
  useEffect(() => {
    const checkCurrentUser = async () => {
      const currentUrl = new URL(window.location.href);

      if (
        currentUrl.pathname.includes("verify-email") ||
        currentUrl.pathname.includes("reset-password")
      ) {
        setAuthChecking(false);
        return;
      }

      if (!authToken) {
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      setAuthChecking(true);

      try {
        const response = await fetch(ME_API_URL, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Sesi login sudah tidak valid.");
        }

        const data = await response.json();

        setCurrentUser(data.user);
        localStorage.setItem("sawitUser", JSON.stringify(data.user));
      } catch (error) {
        console.warn("Auth check error:", error);

        setCurrentUser(null);
        setAuthToken("");
        localStorage.removeItem("sawitAuthToken");
        localStorage.removeItem("sawitUser");
      } finally {
        setAuthChecking(false);
      }
    };

    checkCurrentUser();
  }, [authToken]);

  // Mengambil history prediksi milik user yang sedang login.
  const fetchPredictionHistory = async ({ reset = true } = {}) => {
    const offset = reset ? 0 : dbHistory.length;

    if (reset) {
      setIsLoadingHistory(true);
    } else {
      setIsLoadingMoreHistory(true);
    }

    setHistoryError("");

    try {
      const response = await fetch(
        `${BASE_API_URL}/predictions?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil riwayat prediksi dari server.");
      }

      const data = await response.json();
      const newItems = data.data || [];

      if (reset) {
        setDbHistory(newItems);
      } else {
        setDbHistory((prevHistory) => {
          const existingIds = new Set(prevHistory.map((item) => item.id));
          const uniqueNewItems = newItems.filter(
            (item) => !existingIds.has(item.id),
          );

          return [...prevHistory, ...uniqueNewItems];
        });
      }

      setHasMoreHistory(Boolean(data.has_more));
    } catch (error) {
      console.error("History fetch error:", error);
      setHistoryError(
        error.message || "Terjadi kesalahan saat mengambil history.",
      );
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMoreHistory(false);
    }
  };

  // Mengambil statistik prediksi milik user yang sedang login.
  const fetchDashboardStats = async () => {
    setIsLoadingStats(true);

    try {
      const response = await fetch(STATS_API_URL, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil statistik dari server.");
      }

      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error("Stats fetch error:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Menghapus satu data history milik user yang sedang login.
  const deletePredictionHistory = async (recordId) => {
    const confirmDelete = window.confirm(
      "Yakin ingin menghapus riwayat prediksi ini?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${BASE_API_URL}/predictions/${recordId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus riwayat prediksi.");
      }

      setSelectedHistoryId(null);
      await fetchPredictionHistory({ reset: true });
      await fetchDashboardStats();
    } catch (error) {
      console.error("Delete history error:", error);
      alert(error.message || "Terjadi kesalahan saat menghapus history.");
    }
  };

  // Saat tab History dibuka, ambil data terbaru dari backend.
  useEffect(() => {
    if (currentUser && activeTab === "history") {
      fetchPredictionHistory({ reset: true });
      fetchDashboardStats();
    }
  }, [activeTab, currentUser]);

  // Saat tab Admin dibuka, ambil statistik global dan daftar user.
  useEffect(() => {
    if (currentUser?.role === "admin" && activeTab === "admin") {
      fetchAdminStats();
      fetchAdminUsers();
      fetchAdminStorage();
    }
  }, [activeTab, currentUser]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceLabel = (source) => {
    if (source === "web_upload") return "Upload Web";
    if (source === "camera") return "Kamera";
    if (source === "gallery") return "Galeri";
    return source || "Input";
  };

  // Mengganti mode input antara kamera dan galeri.
  const switchMode = (selectedMode) => {
    stopCamera();
    setMode(selectedMode);
    setCapturedImage(null);
    setSelectedFile(null);
    setResult(null);
    setLowConfidence(null);
    setZoom(1);
  };

  // Membuka kamera perangkat.
  const startCamera = async () => {
    try {
      setCapturedImage(null);
      setSelectedFile(null);
      setResult(null);
      setZoom(1);
      setLowConfidence(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
    } catch (error) {
      console.error(error);
      alert("Kamera gagal dibuka. Pastikan izin kamera sudah diberikan.");
    }
  };

  // Menutup kamera supaya resource kamera tidak terus aktif.
  const stopCamera = () => {
    const video = videoRef.current;

    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    setCameraActive(false);
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.2).toFixed(1)), MAX_ZOOM));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.2).toFixed(1)), 1));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  // Mengambil gambar dari video kamera dan menyimpannya sebagai preview.
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      alert("Kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext("2d");

    const cropWidth = videoWidth / zoom;
    const cropHeight = videoHeight / zoom;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = (videoHeight - cropHeight) / 2;

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(imageData);
    setSelectedFile(null);
    setResult(null);
    setLowConfidence(null);

    stopCamera();
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    setResult(null);
    setLowConfidence(null);
    setZoom(1);

    if (mode === "camera") {
      await startCamera();
    }
  };

  const resetInput = () => {
    stopCamera();
    setCapturedImage(null);
    setSelectedFile(null);
    setResult(null);
    setLowConfidence(null);
    setLoading(false);
    setZoom(1);
  };

  // Membaca gambar dari galeri/file input.
  const handleGalleryImage = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setCapturedImage(reader.result);
      setResult(null);
      setLowConfidence(null);
      stopCamera();
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Mengubah hasil capture kamera dari base64 menjadi File.
  const dataURLtoFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const binary = atob(arr[1]);
    let length = binary.length;
    const u8arr = new Uint8Array(length);

    while (length--) {
      u8arr[length] = binary.charCodeAt(length);
    }

    return new File([u8arr], filename, { type: mime });
  };

  // Mengompres gambar sebelum dikirim ke backend agar upload lebih ringan.
  const compressImageFile = (file, maxWidth = 1280, quality = 0.82) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("File harus berupa gambar."));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");

          const scale = Math.min(1, maxWidth / img.width);
          const targetWidth = Math.round(img.width * scale);
          const targetHeight = Math.round(img.height * scale);

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Gagal mengompres gambar."));
                return;
              }

              const compressedFile = new File(
                [blob],
                `compressed-${Date.now()}.jpg`,
                {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                },
              );

              resolve(compressedFile);
            },
            "image/jpeg",
            quality,
          );
        };

        img.onerror = () => {
          reject(new Error("Gagal membaca gambar untuk kompresi."));
        };

        img.src = reader.result;
      };

      reader.onerror = () => {
        reject(new Error("Gagal membaca file gambar."));
      };

      reader.readAsDataURL(file);
    });
  };

  const saveToHistory = (predictionData, imageData) => {
    const classInfo = getClassInfo(predictionData.predicted_class);

    const newItem = {
      id: Date.now(),
      image: imageData,
      result: predictionData,
      predicted_class: predictionData.predicted_class,
      title: classInfo.title,
      confidence: predictionData.confidence,
      status: classInfo.status,
      source: mode === "camera" ? "Kamera" : "Galeri",
      time: new Date().toLocaleString("id-ID"),
    };

    const updatedHistory = [newItem, ...history].slice(0, 5);

    setHistory(updatedHistory);
    localStorage.setItem(
      "sawitPredictionHistory",
      JSON.stringify(updatedHistory),
    );
  };

  const openHistoryItem = (item) => {
    stopCamera();
    setSelectedHistoryId((prevId) => (prevId === item.id ? null : item.id));
  };

  const deleteHistoryItem = (id) => {
    const updatedHistory = history.filter((item) => item.id !== id);

    setHistory(updatedHistory);
    localStorage.setItem(
      "sawitPredictionHistory",
      JSON.stringify(updatedHistory),
    );

    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setSelectedHistoryId(null);
    localStorage.removeItem("sawitPredictionHistory");
  };

  // Mengirim gambar ke backend FastAPI untuk diprediksi model EfficientNetV2S.
  const predictCapturedImage = async () => {
    if (!capturedImage) {
      alert("Ambil atau pilih gambar dulu ya.");
      return;
    }

    setLoading(true);
    setResult(null);
    setLowConfidence(null);
    setUploadInfo("Menyiapkan gambar...");

    const originalFile =
      mode === "gallery" && selectedFile
        ? selectedFile
        : dataURLtoFile(capturedImage, "sawit-image.jpg");

    let file = originalFile;

    try {
      setUploadInfo("Mengompres gambar...");

      try {
        file = await compressImageFile(originalFile, 1280, 0.82);
      } catch (compressError) {
        console.warn("Kompresi gagal, memakai file asli:", compressError);
        file = originalFile;
      }

      console.log(
        "Original size:",
        (originalFile.size / 1024 / 1024).toFixed(2),
        "MB",
      );
      console.log("Upload size:", (file.size / 1024 / 1024).toFixed(2), "MB");

      const maxFileSize = 5 * 1024 * 1024;

      if (file.size > maxFileSize) {
        alert(
          "Ukuran gambar masih terlalu besar setelah dikompres. Coba gunakan gambar yang lebih kecil atau crop gambar terlebih dahulu.",
        );
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      setUploadInfo("Mengirim gambar ke model AI...");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Backend error";

        try {
          const errorData = await response.json();
          errorMessage = formatApiError(errorData.detail, errorMessage);
        } catch {
          // Kalau response bukan JSON, pakai pesan default.
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const confidenceValue = Number(data.confidence || 0);
      const minimumConfidence = Number(data.history?.minimum_confidence ?? 70);
      const historySaved =
        typeof data.history?.saved === "boolean"
          ? data.history.saved
          : confidenceValue >= minimumConfidence;

      if (!historySaved) {
        setResult(null);
        setLowConfidence({
          confidence: confidenceValue,
          minimumConfidence,
          message:
            data.history?.message ||
            `Hasil prediksi tidak disimpan ke riwayat karena confidence berada di bawah ${minimumConfidence}%. Coba ulang foto dengan cahaya lebih terang, objek lebih jelas, jarak tidak terlalu jauh, dan buah berada di tengah frame.`,
        });
        return;
      }

      setLowConfidence(null);
      setResult(data);

      // History hanya diperbarui ketika backend benar-benar menyimpan prediksi.
      await Promise.all([
        fetchPredictionHistory({ reset: true }),
        fetchDashboardStats(),
      ]);
    } catch (error) {
      console.error(error);
      alert(
        error.message ||
          "Gagal prediksi. Pastikan backend FastAPI masih aktif.",
      );
    } finally {
      setLoading(false);
      setUploadInfo("");
    }
  };

  // Menyiapkan sumber gambar yang aman untuk Canvas.
  // URL gambar dari Supabase diambil sebagai Blob terlebih dahulu agar Canvas
  // tidak terkena error "Tainted canvases may not be exported".
  const prepareImageForCanvas = async (imageSource) => {
    if (!imageSource) {
      throw new Error("Sumber gambar tidak tersedia.");
    }

    // Data URL dan Blob URL sudah berasal dari origin aplikasi.
    if (imageSource.startsWith("data:") || imageSource.startsWith("blob:")) {
      return {
        source: imageSource,
        objectUrl: null,
      };
    }

    const response = await fetch(imageSource, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Gagal mengambil gambar dari penyimpanan. Status: ${response.status}`,
      );
    }

    const imageBlob = await response.blob();

    if (!imageBlob.type.startsWith("image/")) {
      throw new Error("File yang diterima bukan gambar yang valid.");
    }

    const objectUrl = URL.createObjectURL(imageBlob);

    return {
      source: objectUrl,
      objectUrl,
    };
  };

  // Export hasil prediksi menjadi gambar PNG.
  const exportAsImage = async (
    exportResult = result,
    exportImage = capturedImage,
    exportSource = mode,
  ) => {
    if (!exportResult || !exportImage) {
      alert("Belum ada hasil prediksi untuk diekspor.");
      return;
    }

    let temporaryObjectUrl = null;

    try {
      const preparedImage = await prepareImageForCanvas(exportImage);
      temporaryObjectUrl = preparedImage.objectUrl;

      const classInfo = getClassInfo(exportResult.predicted_class);
      const exportCanvas = document.createElement("canvas");
      const ctx = exportCanvas.getContext("2d");

      if (!ctx) {
        throw new Error("Browser gagal membuat Canvas untuk ekspor gambar.");
      }

      exportCanvas.width = 900;
      exportCanvas.height = 1450;

      const drawRoundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      const wrapText = (textValue, x, y, maxWidth, lineHeight) => {
        const words = String(textValue || "").split(" ");
        let line = "";

        for (let i = 0; i < words.length; i++) {
          const testLine = `${line}${words[i]} `;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = `${words[i]} `;
            y += lineHeight;
          } else {
            line = testLine;
          }
        }

        ctx.fillText(line, x, y);
        return y + lineHeight;
      };

      ctx.fillStyle = "#fff7e8";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      ctx.fillStyle = "#24351f";
      ctx.font = "bold 42px Arial";
      ctx.fillText("Hasil Prediksi Sawit", 50, 70);

      ctx.fillStyle = "#6f604c";
      ctx.font = "24px Arial";
      ctx.fillText("Model: EfficientNetV2S", 50, 112);
      ctx.fillText(`Tanggal: ${new Date().toLocaleString("id-ID")}`, 50, 150);
      ctx.fillText(
        `Sumber: ${
          exportSource === "camera" || exportSource === "Kamera"
            ? "Kamera"
            : "Galeri"
        }`,
        50,
        188,
      );

      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () =>
          reject(new Error("Gambar gagal dimuat untuk proses ekspor."));
        img.src = preparedImage.source;
      });

      const imageX = 50;
      const imageY = 230;
      const imageW = 800;
      const imageH = 520;

      // Menggambar dengan teknik object-fit: cover supaya gambar tidak gepeng.
      const sourceRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = imageW / imageH;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.naturalWidth;
      let sourceHeight = img.naturalHeight;

      if (sourceRatio > targetRatio) {
        sourceWidth = img.naturalHeight * targetRatio;
        sourceX = (img.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = img.naturalWidth / targetRatio;
        sourceY = (img.naturalHeight - sourceHeight) / 2;
      }

      ctx.save();
      drawRoundRect(imageX, imageY, imageW, imageH, 28);
      ctx.clip();
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        imageX,
        imageY,
        imageW,
        imageH,
      );
      ctx.restore();

      const cardX = 50;
      const cardY = 800;
      const cardW = 800;
      const cardH = 540;

      ctx.fillStyle = "#ffffff";
      drawRoundRect(cardX, cardY, cardW, cardH, 28);
      ctx.fill();

      let y = cardY + 65;

      ctx.fillStyle = "#24351f";
      ctx.font = "bold 36px Arial";
      ctx.fillText(`Prediksi: ${classInfo.title}`, cardX + 35, y);

      y += 55;
      ctx.fillStyle = "#2f7d32";
      ctx.font = "bold 32px Arial";
      ctx.fillText(`Confidence: ${exportResult.confidence}%`, cardX + 35, y);

      y += 48;
      ctx.fillStyle = "#3d3428";
      ctx.font = "24px Arial";
      ctx.fillText(`Status: ${classInfo.status}`, cardX + 35, y);

      y += 50;
      ctx.fillStyle = "#6f604c";
      ctx.font = "22px Arial";
      y = wrapText(classInfo.description, cardX + 35, y, 720, 32);

      y += 28;
      ctx.fillStyle = "#24351f";
      ctx.font = "bold 24px Arial";
      ctx.fillText("Probabilitas:", cardX + 35, y);

      y += 40;
      Object.entries(exportResult.probabilities || {}).forEach(
        ([label, value]) => {
          ctx.fillStyle = "#3d3428";
          ctx.font = "22px Arial";
          ctx.fillText(
            `${getClassInfo(label).title}: ${Number(value).toFixed(2)}%`,
            cardX + 35,
            y,
          );
          y += 36;
        },
      );

      ctx.fillStyle = "#8a7a65";
      ctx.font = "18px Arial";
      wrapText(
        "Catatan: hasil prediksi digunakan sebagai bantuan awal dan tetap perlu disesuaikan dengan kondisi lapangan.",
        50,
        1400,
        800,
        24,
      );

      const imageDataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");

      link.download = `hasil-prediksi-sawit-${Date.now()}.png`;
      link.href = imageDataUrl;

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export gambar gagal:", error);
      alert(error?.message || "Gambar gagal disimpan. Silakan coba kembali.");
    } finally {
      if (temporaryObjectUrl) {
        URL.revokeObjectURL(temporaryObjectUrl);
      }
    }
  };

  // Export hasil prediksi menjadi PDF lewat fitur print browser.
  const exportAsPDF = (
    exportResult = result,
    exportImage = capturedImage,
    exportSource = mode,
  ) => {
    if (!exportResult || !exportImage) {
      alert("Belum ada hasil prediksi untuk diekspor.");
      return;
    }

    const classInfo = getClassInfo(exportResult.predicted_class);

    const probabilityRows = Object.entries(exportResult.probabilities || {})
      .map(
        ([label, value]) => `
        <tr>
          <td>${getClassInfo(label).title}</td>
          <td>${Number(value).toFixed(2)}%</td>
        </tr>
      `,
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup diblokir. Izinkan popup untuk menyimpan PDF.");
      return;
    }

    printWindow.document.write(`
    <html>
      <head>
        <title>Hasil Prediksi Sawit</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #fff7e8;
            padding: 24px;
            color: #24351f;
          }
          .card {
            max-width: 720px;
            margin: auto;
            background: #ffffff;
            border-radius: 20px;
            padding: 24px;
            border: 1px solid #ead8bd;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }
          .meta {
            color: #6f604c;
            margin-bottom: 18px;
          }
          img {
            width: 100%;
            max-height: 420px;
            object-fit: cover;
            border-radius: 16px;
            margin-bottom: 18px;
          }
          .result {
            background: #f4ead8;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .prediction {
            font-size: 26px;
            font-weight: bold;
            margin: 0;
          }
          .confidence {
            color: #2f7d32;
            font-size: 22px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #ead8bd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f4ead8;
          }
          p {
            line-height: 1.5;
          }
          @media print {
            body {
              background: #ffffff;
            }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Hasil Prediksi Sawit</h1>
          <div class="meta">
            Model: EfficientNetV2S<br/>
            Tanggal: ${new Date().toLocaleString("id-ID")}<br/>
            Sumber: ${
              exportSource === "camera" || exportSource === "Kamera"
                ? "Kamera"
                : "Galeri"
            }
          </div>

          <img src="${exportImage}" />

          <div class="result">
            <p class="prediction">${classInfo.icon} ${classInfo.title}</p>
            <p>Status: <b>${classInfo.status}</b></p>
            <p class="confidence">Confidence: ${exportResult.confidence}%</p>
          </div>

          <h3>Rekomendasi</h3>
          <p>${classInfo.description}</p>

          <h3>Kenapa hasil ini muncul?</h3>
          <p>${classInfo.reason}</p>

          <h3>Saran tindakan</h3>
          <p>${classInfo.action}</p>

          <h3>Probabilitas</h3>
          <table>
            <thead>
              <tr>
                <th>Kelas</th>
                <th>Probabilitas</th>
              </tr>
            </thead>
            <tbody>
              ${probabilityRows}
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
  };

  // =====================
  // FUNGSI AUTENTIKASI
  // =====================

  // Mengubah isi form login/register.
  const handleAuthInputChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));

    if (authError) setAuthError("");
    if (authSuccess) setAuthSuccess("");
  };

  // Mengirim request login atau register ke FastAPI.
  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const isRegister = authMode === "register";

      const payload = isRegister
        ? {
            name: authForm.name.trim(),
            email: authForm.email.trim(),
            password: authForm.password,
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password,
          };

      const response = await fetch(
        isRegister ? REGISTER_API_URL : LOGIN_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        let message = isRegister ? "Registrasi gagal." : "Login gagal.";

        try {
          const errorData = await response.json();
          message = formatApiError(errorData.detail, message);
        } catch {
          // Kalau response bukan JSON, tetap pakai pesan default.
        }

        throw new Error(message);
      }

      const data = await response.json();

      // Register sekarang tidak langsung login. User harus verifikasi email dulu.
      if (isRegister) {
        setAuthMode("login");
        setAuthSuccess(
          data.message ||
            "Registrasi berhasil. Silakan cek email untuk verifikasi akun.",
        );
        setAuthForm({
          name: "",
          email: authForm.email.trim(),
          password: "",
        });
        return;
      }

      // Login berhasil: simpan token agar user tidak perlu login ulang saat refresh browser.
      setAuthToken(data.access_token);
      setCurrentUser(data.user);

      localStorage.setItem("sawitAuthToken", data.access_token);
      localStorage.setItem("sawitUser", JSON.stringify(data.user));

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });

      setActiveTab("home");
    } catch (error) {
      setAuthError(
        getFriendlyErrorMessage(error, "Terjadi kesalahan autentikasi."),
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout user dan bersihkan semua data sesi di frontend.
  const handleLogout = () => {
    stopCamera();

    setAuthToken("");
    setCurrentUser(null);
    setDbHistory([]);
    setSelectedHistoryId(null);
    setResult(null);
    setLowConfidence(null);
    setCapturedImage(null);
    setSelectedFile(null);
    setActiveTab("home");
    setAdminStats(null);
    setAdminUsers([]);
    setChangePasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setChangePasswordError("");
    setChangePasswordSuccess("");

    localStorage.removeItem("sawitAuthToken");
    localStorage.removeItem("sawitUser");
  };
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  const handleProfileInputChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));

    setProfileError("");
    setProfileMessage("");
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();

    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const response = await fetch(UPDATE_PROFILE_API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Profil gagal diperbarui."),
        );
      }

      setProfileMessage(data.message || "Profil berhasil diperbarui.");

      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("sawitUser", JSON.stringify(data.user));
      }

      if (data.email_changed) {
        setTimeout(() => {
          handleLogout();
        }, 2500);
      }
    } catch (error) {
      setProfileError(
        getFriendlyErrorMessage(error, "Profil gagal diperbarui."),
      );
    } finally {
      setProfileSaving(false);
    }
  };
  // Mengubah input form ganti password di halaman Profile.
  const handleChangePasswordInput = (event) => {
    const { name, value } = event.target;

    setChangePasswordForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));

    if (changePasswordError) setChangePasswordError("");
    if (changePasswordSuccess) setChangePasswordSuccess("");
  };

  // Mengirim request ganti password ke backend.
  const handleChangePasswordSubmit = async (event) => {
    event.preventDefault();

    setChangePasswordLoading(true);
    setChangePasswordError("");
    setChangePasswordSuccess("");

    try {
      if (changePasswordForm.newPassword.length < 6) {
        throw new Error("Password baru minimal 6 karakter.");
      }

      if (
        changePasswordForm.newPassword !== changePasswordForm.confirmPassword
      ) {
        throw new Error("Konfirmasi password baru tidak sama.");
      }

      if (changePasswordForm.oldPassword === changePasswordForm.newPassword) {
        throw new Error("Password baru tidak boleh sama dengan password lama.");
      }

      const response = await fetch(CHANGE_PASSWORD_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          old_password: changePasswordForm.oldPassword,
          new_password: changePasswordForm.newPassword,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau response bukan JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal mengubah password."),
        );
      }

      setChangePasswordSuccess(data.message || "Password berhasil diubah.");
      setChangePasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setChangePasswordError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengubah password.",
        ),
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Mengambil statistik global khusus admin.
  const fetchAdminStats = async () => {
    if (currentUser?.role !== "admin") return;

    setAdminLoading(true);
    setAdminError("");

    try {
      const response = await fetch(ADMIN_STATS_API_URL, {
        headers: getAuthHeaders(),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau response bukan JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal mengambil data admin."),
        );
      }

      setAdminStats(data);
    } catch (error) {
      console.error("Admin stats error:", error);
      setAdminError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengambil data admin.",
        ),
      );
    } finally {
      setAdminLoading(false);
    }
  };

  // Mengambil daftar user untuk admin.
  const fetchAdminUsers = async () => {
    if (currentUser?.role !== "admin") return;

    setAdminUsersLoading(true);
    setAdminError("");

    try {
      const response = await fetch(`${ADMIN_USERS_API_URL}?limit=50&offset=0`, {
        headers: getAuthHeaders(),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau response bukan JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal mengambil daftar user."),
        );
      }

      setAdminUsers(data.data || []);
    } catch (error) {
      console.error("Admin users error:", error);
      setAdminError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengambil daftar user.",
        ),
      );
    } finally {
      setAdminUsersLoading(false);
    }
  };

  // Mengubah nama action backend menjadi label yang mudah dibaca.
  const getActivityActionInfo = (action) => {
    const actionMap = {
      REGISTER: { label: "Registrasi akun", icon: "🆕", tone: "green" },
      LOGIN: { label: "Login berhasil", icon: "🔐", tone: "blue" },
      LOGIN_FAILED: { label: "Login gagal", icon: "🚫", tone: "red" },
      VERIFY_EMAIL: { label: "Verifikasi email", icon: "📧", tone: "green" },
      FORGOT_PASSWORD: { label: "Lupa password", icon: "🔑", tone: "orange" },
      RESET_PASSWORD: { label: "Reset password", icon: "♻️", tone: "orange" },
      CHANGE_PASSWORD: { label: "Ganti password", icon: "🛡️", tone: "blue" },
      CREATE_PREDICTION: {
        label: "Membuat prediksi",
        icon: "🌴",
        tone: "green",
      },
      DELETE_HISTORY: { label: "Menghapus riwayat", icon: "🗑️", tone: "red" },
      ADMIN_ACTIVATE_USER: {
        label: "Admin mengaktifkan user",
        icon: "✅",
        tone: "green",
      },
      ADMIN_DEACTIVATE_USER: {
        label: "Admin menonaktifkan user",
        icon: "⛔",
        tone: "red",
      },
    };

    return (
      actionMap[action] || {
        label: String(action || "Aktivitas sistem").replaceAll("_", " "),
        icon: "🧾",
        tone: "gray",
      }
    );
  };

  // Mengambil activity log dengan filter, pencarian, dan pagination.
  const fetchAdminActivityLogs = async ({
    page = 1,
    reset = true,
    action = adminActivityFilter,
    search = adminActivitySearch,
  } = {}) => {
    if (currentUser?.role !== "admin") return;

    if (reset) {
      setAdminActivityLoading(true);
    } else {
      setAdminActivityLoadingMore(true);
    }

    setAdminActivityError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "10",
      });

      if (action) params.set("action", action);
      if (search.trim()) params.set("search", search.trim());

      const response = await fetch(
        `${ADMIN_ACTIVITY_LOGS_API_URL}?${params.toString()}`,
        { headers: getAuthHeaders() },
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Tetap gunakan pesan default apabila response bukan JSON.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal mengambil activity log."),
        );
      }

      const items = data.data || [];

      if (reset) {
        setAdminActivityLogs(items);
      } else {
        setAdminActivityLogs((previousLogs) => {
          const existingIds = new Set(previousLogs.map((item) => item.id));
          const uniqueItems = items.filter((item) => !existingIds.has(item.id));
          return [...previousLogs, ...uniqueItems];
        });
      }

      setAdminActivityPage(Number(data.page || page));
      setAdminActivityTotalPages(Number(data.total_pages || 1));
      setAdminActivityHasMore(Boolean(data.has_more));
    } catch (error) {
      console.error("Admin activity log error:", error);
      setAdminActivityError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengambil activity log.",
        ),
      );
    } finally {
      setAdminActivityLoading(false);
      setAdminActivityLoadingMore(false);
    }
  };

  const handleAdminActivitySearch = (event) => {
    event.preventDefault();
    const nextSearch = adminActivitySearchInput.trim();
    setAdminActivitySearch(nextSearch);
    fetchAdminActivityLogs({ page: 1, reset: true, search: nextSearch });
  };

  const handleAdminActivityFilter = (event) => {
    const nextFilter = event.target.value;
    setAdminActivityFilter(nextFilter);
    fetchAdminActivityLogs({
      page: 1,
      reset: true,
      action: nextFilter,
      search: adminActivitySearch,
    });
  };

  const fetchAdminStorage = async () => {
    if (currentUser?.role !== "admin") return;

    setAdminStorageLoading(true);
    setAdminError("");

    try {
      const response = await fetch(ADMIN_STORAGE_API_URL, {
        headers: getAuthHeaders(),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Pakai pesan default jika response bukan JSON.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal mengambil statistik storage."),
        );
      }

      setAdminStorage(data);
    } catch (error) {
      console.error("Admin storage error:", error);
      setAdminError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengambil statistik storage.",
        ),
      );
    } finally {
      setAdminStorageLoading(false);
    }
  };

  const handleAdminStorageCleanup = async () => {
    if (currentUser?.role !== "admin") return;

    const cleanupLimit = Number(adminStorageCleanupLimit);

    const confirmed = window.confirm(
      `Yakin ingin menghapus gambar dari ${cleanupLimit} record prediksi paling lama? Data hasil prediksi tetap disimpan.`,
    );

    if (!confirmed) return;

    setAdminStorageCleanupLoading(true);
    setAdminStorageCleanupMessage("");
    setAdminStorageCleanupError("");

    try {
      const response = await fetch(
        `${ADMIN_STORAGE_CLEANUP_API_URL}?limit=${cleanupLimit}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Gunakan pesan default ketika response bukan JSON.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Cleanup storage gagal dilakukan."),
        );
      }

      const failedCount = Array.isArray(data.failed_records)
        ? data.failed_records.length
        : 0;

      setAdminStorageCleanupMessage(
        `${data.message || "Cleanup storage selesai."}${
          failedCount > 0 ? ` ${failedCount} record gagal dibersihkan.` : ""
        }`,
      );

      await Promise.all([
        fetchAdminStorage(),
        fetchAdminStats(),
        fetchAdminActivityLogs({ page: 1, reset: true }),
      ]);
    } catch (error) {
      console.error("Admin storage cleanup error:", error);
      setAdminStorageCleanupError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat membersihkan storage.",
        ),
      );
    } finally {
      setAdminStorageCleanupLoading(false);
    }
  };

  // Mengaktifkan atau menonaktifkan akun user dari halaman admin.
  const handleToggleUserStatus = async (targetUser) => {
    if (!targetUser?.id) return;

    const nextStatus = !targetUser.is_active;
    const actionLabel = nextStatus ? "mengaktifkan" : "menonaktifkan";

    const confirmed = window.confirm(
      `Yakin ingin ${actionLabel} akun ${targetUser.email}?`,
    );

    if (!confirmed) return;

    setAdminActionLoadingId(targetUser.id);
    setAdminError("");

    try {
      const response = await fetch(
        `${ADMIN_USERS_API_URL}/${targetUser.id}/status?is_active=${nextStatus}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        },
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau response bukan JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal memperbarui status user."),
        );
      }

      await fetchAdminStats();
      await fetchAdminUsers();
      await fetchAdminActivityLogs({ page: 1, reset: true });
    } catch (error) {
      console.error("Toggle user status error:", error);
      setAdminError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat memperbarui user.",
        ),
      );
    } finally {
      setAdminActionLoadingId(null);
    }
  };

  // Mengirim email reset password ke akun user.
  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();

    setForgotLoading(true);
    setForgotMessage("");
    setForgotError("");

    try {
      const response = await fetch(FORGOT_PASSWORD_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau backend tidak mengirim JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(
          formatApiError(data.detail, "Gagal memproses lupa password."),
        );
      }

      setForgotMessage(
        data.message ||
          "Jika email terdaftar, link reset password akan dikirim.",
      );
    } catch (error) {
      setForgotError(
        getFriendlyErrorMessage(
          error,
          "Terjadi kesalahan saat mengirim email.",
        ),
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Mengubah password menggunakan token reset dari email.
  const handleResetPasswordSubmit = async (event) => {
    event.preventDefault();

    const currentUrl = new URL(window.location.href);
    const resetToken = currentUrl.searchParams.get("token");

    setResetMessage("");

    if (!resetToken) {
      setResetStatus("error");
      setResetMessage("Token reset password tidak ditemukan.");
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      setResetStatus("error");
      setResetMessage("Password minimal 6 karakter.");
      return;
    }

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setResetStatus("error");
      setResetMessage("Konfirmasi password tidak sama.");
      return;
    }

    setResetLoading(true);
    setResetStatus("loading");

    try {
      const response = await fetch(RESET_PASSWORD_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          new_password: resetPasswordForm.newPassword,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Kalau backend tidak mengirim JSON, tetap pakai pesan default.
      }

      if (!response.ok) {
        throw new Error(formatApiError(data.detail, "Reset password gagal."));
      }

      setResetStatus("success");
      setResetMessage(
        data.message || "Password berhasil diubah. Silakan login.",
      );

      setResetPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });

      // Bersihkan token dari URL supaya link tidak kepakai ulang di frontend.
      window.history.replaceState({}, "", "/reset-password");
    } catch (error) {
      setResetStatus("error");
      setResetMessage(error.message || "Terjadi kesalahan reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  // Kembali ke halaman login setelah proses reset password selesai.
  const handleGoToLoginAfterResetPassword = () => {
    window.history.replaceState({}, "", "/");
    setResetPasswordForm({
      newPassword: "",
      confirmPassword: "",
    });
    setResetStatus("idle");
    setResetMessage("");
    setAuthMode("login");
    setAuthError("");
    setAuthSuccess(
      "Password berhasil diubah. Silakan login dengan password baru.",
    );
  };

  // Kembali ke halaman login setelah proses verifikasi email selesai.
  const handleGoToLoginAfterVerification = () => {
    window.history.replaceState({}, "", "/");
    setEmailVerification({ status: "idle", message: "" });
    setAuthMode("login");
    setAuthError("");
    setAuthSuccess(
      "Email berhasil diverifikasi. Silakan login menggunakan akun kamu.",
    );
  };

  const classInfo = result ? getClassInfo(result.predicted_class) : null;
  const stats = getHistoryStats();
  const confidence = result ? Number(result.confidence) : 0;

  const serverStats = dashboardStats?.by_class || {};

  const totalPredictions =
    dashboardStats?.total_predictions ?? dbHistory.length;

  const avgConfidenceAll = (() => {
    const values = Object.values(serverStats)
      .map((item) => Number(item.avg_confidence || 0))
      .filter((value) => value > 0);

    if (values.length === 0) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  })();

  const filteredHistory =
    historyFilter === "all"
      ? dbHistory
      : dbHistory.filter((item) => item.predicted_class === historyFilter);

  // =====================
  // TAMPILAN HALAMAN RESET PASSWORD
  // =====================
  const isResetPasswordPage =
    window.location.pathname.includes("reset-password");

  if (isResetPasswordPage) {
    const isSuccessReset = resetStatus === "success";
    const isLoadingReset = resetStatus === "loading" || resetLoading;

    return (
      <div className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <main className="phone-shell auth-shell">
          <section className="auth-hero verify-hero">
            <div className="auth-logo">🔐</div>
            <p className="eyebrow">SawitVision AI</p>
            <h1>Reset Password</h1>
            <p>Buat password baru untuk akun SawitVision AI kamu.</p>
          </section>

          <section className="auth-card verify-card">
            {isSuccessReset ? (
              <div className="auth-success-box">
                <div className="auth-success-icon">✅</div>
                <h2>Password Berhasil Diubah</h2>
                <p>
                  {resetMessage || "Silakan login menggunakan password baru."}
                </p>

                <button
                  type="button"
                  className="primary-btn full"
                  onClick={handleGoToLoginAfterResetPassword}
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
                <label>
                  Password Baru
                  <input
                    type="password"
                    value={resetPasswordForm.newPassword}
                    onChange={(event) => {
                      setResetPasswordForm((prevForm) => ({
                        ...prevForm,
                        newPassword: event.target.value,
                      }));
                      setResetMessage("");
                      setResetStatus("idle");
                    }}
                    placeholder="Masukkan password baru"
                    minLength={6}
                    required
                  />
                </label>

                <label>
                  Konfirmasi Password
                  <input
                    type="password"
                    value={resetPasswordForm.confirmPassword}
                    onChange={(event) => {
                      setResetPasswordForm((prevForm) => ({
                        ...prevForm,
                        confirmPassword: event.target.value,
                      }));
                      setResetMessage("");
                      setResetStatus("idle");
                    }}
                    placeholder="Ulangi password baru"
                    minLength={6}
                    required
                  />
                </label>

                {resetMessage && (
                  <div
                    className={
                      resetStatus === "error"
                        ? "auth-error"
                        : "auth-success-message"
                    }
                  >
                    {resetStatus === "error" ? "⚠️" : "✅"} {resetMessage}
                  </div>
                )}

                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={isLoadingReset}
                >
                  {isLoadingReset ? "Memproses..." : "Simpan Password Baru"}
                </button>

                <button
                  type="button"
                  className="secondary-btn full"
                  onClick={handleGoToLoginAfterResetPassword}
                >
                  Kembali ke Login
                </button>
              </form>
            )}
          </section>

          <section className="auth-note">
            <b>Keamanan Akun</b>
            <p>
              Link reset password hanya bisa digunakan satu kali dan memiliki
              batas waktu tertentu.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // =====================
  // TAMPILAN HALAMAN VERIFIKASI EMAIL
  // =====================
  const isVerifyEmailPage = window.location.pathname.includes("verify-email");

  if (isVerifyEmailPage) {
    const isLoadingVerification = emailVerification.status === "loading";
    const isSuccessVerification = emailVerification.status === "success";
    const isErrorVerification = emailVerification.status === "error";

    return (
      <div className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <main className="phone-shell auth-shell">
          <section className="auth-hero verify-hero">
            <div className="auth-logo">🌴</div>
            <p className="eyebrow">SawitVision AI</p>
            <h1>Verifikasi Email</h1>
            <p>
              Sistem sedang memastikan bahwa email yang digunakan benar-benar
              milik kamu.
            </p>
          </section>

          <section className="auth-card verify-card">
            {isLoadingVerification && <div className="spinner"></div>}

            <div className="verify-icon">
              {isLoadingVerification
                ? "⏳"
                : isSuccessVerification
                  ? "✅"
                  : "⚠️"}
            </div>

            <h2>
              {isLoadingVerification
                ? "Memproses Verifikasi"
                : isSuccessVerification
                  ? "Email Berhasil Diverifikasi"
                  : "Verifikasi Gagal"}
            </h2>

            <p>
              {emailVerification.message ||
                "Sedang memproses link verifikasi email kamu."}
            </p>

            {(isSuccessVerification || isErrorVerification) && (
              <button
                type="button"
                className="primary-btn full"
                onClick={handleGoToLoginAfterVerification}
              >
                Kembali ke Login
              </button>
            )}
          </section>

          <section className="auth-note">
            <b>Keamanan Akun</b>
            <p>
              Verifikasi email membantu memastikan akun SawitVision AI digunakan
              oleh pemilik email yang benar.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // =====================
  // TAMPILAN SAAT AUTH SEDANG DICEK
  // =====================
  if (authChecking) {
    return (
      <div className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <main className="phone-shell auth-shell">
          <section className="loading-card">
            <div className="spinner"></div>
            <h2>Memeriksa Sesi</h2>
            <p>Sistem sedang mengecek status login akun kamu.</p>
          </section>
        </main>
      </div>
    );
  }

  // =====================
  // TAMPILAN LOGIN / REGISTER
  // =====================
  if (!currentUser) {
    return (
      <div className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <main className="phone-shell auth-shell">
          <section className="auth-hero">
            <div className="auth-logo">🌴</div>
            <p className="eyebrow">SawitVision AI</p>
            <h1>
              {authMode === "login"
                ? "Masuk Akun"
                : authMode === "register"
                  ? "Daftar Akun"
                  : "Lupa Password"}
            </h1>
            <p>
              {authMode === "forgot"
                ? "Masukkan email akun kamu untuk menerima link reset password."
                : "Login untuk menyimpan riwayat prediksi dan mengelola hasil klasifikasi sawit berdasarkan akun pengguna."}
            </p>

            <button
              className="theme-toggle auth-theme-toggle"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </section>

          <section className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Login
              </button>

              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                Register
              </button>
            </div>

            {authMode === "forgot" ? (
              <form className="auth-form" onSubmit={handleForgotPasswordSubmit}>
                <label>
                  Email Akun
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => {
                      setForgotEmail(event.target.value);
                      setForgotMessage("");
                      setForgotError("");
                    }}
                    placeholder="Masukkan email akun kamu"
                    required
                  />
                </label>

                {forgotMessage && (
                  <div className="auth-success-message">✅ {forgotMessage}</div>
                )}

                {forgotError && (
                  <div className="auth-error">⚠️ {forgotError}</div>
                )}

                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Mengirim..." : "Kirim Link Reset Password"}
                </button>

                <button
                  type="button"
                  className="secondary-btn full"
                  onClick={() => {
                    setAuthMode("login");
                    setForgotEmail("");
                    setForgotMessage("");
                    setForgotError("");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                >
                  Kembali ke Login
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <label>
                    Nama Lengkap
                    <input
                      type="text"
                      name="name"
                      value={authForm.name}
                      onChange={handleAuthInputChange}
                      placeholder="Masukkan nama kamu"
                      minLength={2}
                      required
                    />
                  </label>
                )}

                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthInputChange}
                    placeholder="contoh@email.com"
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthInputChange}
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    required
                  />
                </label>

                {authMode === "login" && (
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => {
                      setAuthMode("forgot");
                      setForgotEmail(authForm.email);
                      setAuthError("");
                      setAuthSuccess("");
                      setForgotMessage("");
                      setForgotError("");
                    }}
                  >
                    Lupa Password?
                  </button>
                )}

                {authError && <div className="auth-error">⚠️ {authError}</div>}

                {authSuccess && (
                  <div className="auth-success">✅ {authSuccess}</div>
                )}

                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Memproses..."
                    : authMode === "login"
                      ? "Masuk"
                      : "Daftar Akun"}
                </button>
              </form>
            )}
          </section>

          <section className="auth-note">
            <b>Model EfficientNetV2S</b>
            <p>
              Sistem klasifikasi sawit dengan riwayat prediksi berbasis akun,
              database Neon, dan penyimpanan gambar Supabase.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // =====================
  // TAMPILAN UTAMA SETELAH USER LOGIN
  // =====================
  return (
    <div className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      <main className="phone-shell">
        {activeTab === "home" && (
          <>
            <section className="header">
              <p className="eyebrow">EfficientNetV2S</p>

              <div className="title-row">
                <h1>Klasifikasi Sawit</h1>

                <button className="theme-toggle" onClick={toggleTheme}>
                  {theme === "dark" ? "☀️" : "🌙"}
                </button>

                <button
                  className="theme-toggle logout-toggle"
                  onClick={handleLogout}
                  title="Logout"
                >
                  🚪
                </button>
              </div>

              <p className="subtitle">
                Gunakan kamera atau galeri untuk prediksi kematangan buah sawit.
              </p>

              {currentUser && (
                <div className="user-pill">
                  👤 {currentUser.name} • {currentUser.email}
                </div>
              )}
            </section>

            <section className="mode-switch">
              <button
                className={mode === "camera" ? "mode-btn active" : "mode-btn"}
                onClick={() => switchMode("camera")}
              >
                Kamera
              </button>

              <button
                className={mode === "gallery" ? "mode-btn active" : "mode-btn"}
                onClick={() => switchMode("gallery")}
              >
                Galeri
              </button>
            </section>

            <section className="tips-card">
              <div className="tips-icon">💡</div>
              <div>
                <b>Tips foto terbaik</b>
                <p>
                  Pastikan buah terlihat jelas, cahaya cukup, dan objek berada
                  di tengah kotak panduan.
                </p>
              </div>
            </section>

            <section className="camera-card">
              <div className="camera-frame">
                {!capturedImage ? (
                  mode === "camera" ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-media"
                      style={{ transform: `scale(${zoom})` }}
                    />
                  ) : (
                    <div className="gallery-placeholder">
                      <span>🖼️</span>
                      <p>Belum ada foto dipilih</p>
                    </div>
                  )
                ) : (
                  <img
                    src={capturedImage}
                    alt="Hasil input"
                    className="camera-media"
                  />
                )}

                {mode === "camera" && !cameraActive && !capturedImage && (
                  <div className="camera-placeholder">
                    <span>📷</span>
                    <p>Kamera belum aktif</p>
                  </div>
                )}

                {mode === "camera" && !capturedImage && (
                  <>
                    <div className="camera-guide"></div>
                    <div className="zoom-badge">{zoom.toFixed(1)}x</div>
                  </>
                )}
              </div>

              {mode === "camera" && !capturedImage && (
                <div className="zoom-panel">
                  <button
                    onClick={zoomOut}
                    disabled={!cameraActive || zoom <= 1}
                  >
                    −
                  </button>

                  <div className="zoom-info">
                    <span>Zoom</span>
                    <b>{zoom.toFixed(1)}x</b>
                  </div>

                  <button
                    onClick={zoomIn}
                    disabled={!cameraActive || zoom >= MAX_ZOOM}
                  >
                    +
                  </button>

                  <button
                    className="reset-zoom"
                    onClick={resetZoom}
                    disabled={!cameraActive || zoom === 1}
                  >
                    Reset
                  </button>
                </div>
              )}

              {mode === "camera" ? (
                <div className="button-grid">
                  {capturedImage ? (
                    <button className="secondary-btn" onClick={retakePhoto}>
                      Foto Ulang
                    </button>
                  ) : !cameraActive ? (
                    <button className="secondary-btn" onClick={startCamera}>
                      Buka Kamera
                    </button>
                  ) : (
                    <button className="danger-btn" onClick={stopCamera}>
                      Tutup Kamera
                    </button>
                  )}

                  {!capturedImage ? (
                    <button
                      className="primary-btn"
                      onClick={captureImage}
                      disabled={!cameraActive}
                    >
                      Ambil Gambar
                    </button>
                  ) : (
                    <button
                      className="primary-btn"
                      onClick={predictCapturedImage}
                      disabled={loading}
                    >
                      {loading ? "Menganalisis..." : "Prediksi"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="button-grid">
                  <button className="secondary-btn" onClick={resetInput}>
                    Reset
                  </button>

                  <button className="primary-btn" onClick={openGallery}>
                    {capturedImage ? "Ganti Foto" : "Pilih Foto"}
                  </button>
                </div>
              )}
              {mode === "camera" && capturedImage && (
                <button className="secondary-btn full" onClick={resetInput}>
                  Reset
                </button>
              )}
              {mode === "gallery" && capturedImage && (
                <button
                  className="primary-btn full"
                  onClick={predictCapturedImage}
                  disabled={loading}
                >
                  {loading ? "Menganalisis..." : "Prediksi Sekarang"}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryImage}
                style={{ display: "none" }}
              />
            </section>

            {loading && (
              <section className="loading-card">
                <div className="spinner"></div>
                <h2>Menganalisis Citra</h2>
                <p>
                  {uploadInfo ||
                    "Model EfficientNetV2S sedang memproses gambar sawit."}
                </p>
              </section>
            )}

            {lowConfidence && (
              <section className="low-confidence-card">
                <div className="low-confidence-icon">⚠️</div>
                <div>
                  <p className="result-label">Hasil tidak disimpan</p>
                  <h2>Confidence Rendah</h2>
                  <b>{lowConfidence.confidence.toFixed(2)}%</b>
                  {lowConfidence.minimumConfidence != null && (
                    <small>
                      Batas minimum penyimpanan:{" "}
                      {Number(lowConfidence.minimumConfidence).toFixed(0)}%
                    </small>
                  )}
                  <p>{lowConfidence.message}</p>
                </div>
              </section>
            )}

            {result && classInfo && (
              <section className={`result-card result-${classInfo.color}`}>
                <div className="result-top">
                  <div className="result-icon">{classInfo.icon}</div>
                  <div>
                    <p className="result-label">Hasil Prediksi</p>
                    <h2>{classInfo.title}</h2>
                  </div>
                </div>

                <div className="status-pill">{classInfo.status}</div>

                <div className="confidence-box">
                  <span>Confidence</span>
                  <b>{result.confidence}%</b>
                  <small>{getConfidenceStatus(confidence)}</small>
                </div>

                <div className="scan-meta">
                  <span>📅 {new Date().toLocaleDateString("id-ID")}</span>
                  <span>📷 {mode === "camera" ? "Kamera" : "Galeri"}</span>
                </div>

                <div className="recommendation-box">
                  <b>Rekomendasi</b>
                  <p>{classInfo.description}</p>
                </div>

                <div className="recommendation-box">
                  <b>Kenapa hasil ini muncul?</b>
                  <p>{classInfo.reason}</p>
                </div>

                <div className="recommendation-box">
                  <b>Saran tindakan</b>
                  <p>{classInfo.action}</p>
                </div>

                <div className="fruit-info-box">
                  <b>Informasi Buah Sawit</b>
                  <ul>
                    {(classInfo.fruitInfo || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="prob-list">
                  {Object.entries(result.probabilities || {}).map(
                    ([label, value]) => {
                      const percent = Number(value);

                      return (
                        <div className="prob-bar-item" key={label}>
                          <div className="prob-bar-top">
                            <span>{getClassInfo(label).title}</span>
                            <b>{percent.toFixed(2)}%</b>
                          </div>

                          <div className="prob-track">
                            <div
                              className="prob-fill"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            <section className="header">
              <p className="eyebrow">Riwayat Prediksi</p>
              <h1>History</h1>
              <p className="subtitle">
                Riwayat prediksi tersimpan di Neon PostgreSQL dan gambar
                tersimpan di Supabase Storage.
              </p>
            </section>

            <section className="history-card">
              <div className="history-header">
                <div>
                  <p className="result-label">Ringkasan</p>
                  <h2>Prediksi Tersimpan</h2>
                </div>

                <button
                  className="clear-history-btn"
                  onClick={fetchPredictionHistory}
                  disabled={isLoadingHistory}
                >
                  {isLoadingHistory ? "Memuat..." : "Refresh"}
                </button>
              </div>

              <div className="history-dashboard">
                <div className="dashboard-card total-card">
                  <span className="dash-icon">📦</span>
                  <div>
                    <small>Total Prediksi</small>
                    <b>{isLoadingStats ? "..." : totalPredictions}</b>
                  </div>
                </div>

                <div className="dashboard-card confidence-card">
                  <span className="dash-icon">🎯</span>
                  <div>
                    <small>Rata-rata Confidence</small>
                    <b>
                      {isLoadingStats
                        ? "..."
                        : `${avgConfidenceAll.toFixed(1)}%`}
                    </b>
                  </div>
                </div>

                <div className="dashboard-mini-grid">
                  <div className="mini-stat belum">
                    <span>🟢</span>
                    <small>Belum</small>
                    <b>{serverStats.belum_masak?.total ?? stats.belum_masak}</b>
                  </div>

                  <div className="mini-stat masak">
                    <span>🟠</span>
                    <small>Masak</small>
                    <b>{serverStats.masak?.total ?? stats.masak}</b>
                  </div>

                  <div className="mini-stat terlalu">
                    <span>🔴</span>
                    <small>Terlalu</small>
                    <b>
                      {serverStats.terlalu_masak?.total ?? stats.terlalu_masak}
                    </b>
                  </div>
                </div>
              </div>

              <div className="history-filter-premium">
                <button
                  className={
                    historyFilter === "all"
                      ? "filter-chip active all"
                      : "filter-chip all"
                  }
                  onClick={() => setHistoryFilter("all")}
                >
                  <span className="filter-icon">🌾</span>
                  <span className="filter-text">
                    <b>Semua</b>
                    <small>{dbHistory.length} data</small>
                  </span>
                </button>

                <button
                  className={
                    historyFilter === "belum_masak"
                      ? "filter-chip active belum"
                      : "filter-chip belum"
                  }
                  onClick={() => setHistoryFilter("belum_masak")}
                >
                  <span className="filter-icon">🟢</span>
                  <span className="filter-text">
                    <b>Belum</b>
                    <small>{stats.belum_masak} data</small>
                  </span>
                </button>

                <button
                  className={
                    historyFilter === "masak"
                      ? "filter-chip active masak"
                      : "filter-chip masak"
                  }
                  onClick={() => setHistoryFilter("masak")}
                >
                  <span className="filter-icon">🟠</span>
                  <span className="filter-text">
                    <b>Masak</b>
                    <small>{stats.masak} data</small>
                  </span>
                </button>

                <button
                  className={
                    historyFilter === "terlalu_masak"
                      ? "filter-chip active terlalu"
                      : "filter-chip terlalu"
                  }
                  onClick={() => setHistoryFilter("terlalu_masak")}
                >
                  <span className="filter-icon">🔴</span>
                  <span className="filter-text">
                    <b>Terlalu</b>
                    <small>{stats.terlalu_masak} data</small>
                  </span>
                </button>
              </div>

              {historyError && (
                <div className="empty-card" style={{ marginTop: "16px" }}>
                  <div className="empty-icon">⚠️</div>
                  <h2>History Gagal Dimuat</h2>
                  <p>{historyError}</p>
                  <button
                    className="primary-btn full"
                    onClick={fetchPredictionHistory}
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {isLoadingHistory && !historyError && (
                <div className="empty-card" style={{ marginTop: "16px" }}>
                  <div className="spinner"></div>
                  <h2>Memuat Riwayat</h2>
                  <p>Sistem sedang mengambil data dari database.</p>
                </div>
              )}

              {!isLoadingHistory &&
                !historyError &&
                filteredHistory.length === 0 && (
                  <div className="empty-card" style={{ marginTop: "16px" }}>
                    <div className="empty-icon">📊</div>
                    <h2>Belum Ada Riwayat</h2>
                    <p>
                      {historyFilter === "all"
                        ? "Hasil prediksi akan muncul di sini setelah kamu melakukan prediksi gambar."
                        : "Belum ada riwayat pada filter kelas ini."}
                    </p>
                    <button
                      className="primary-btn full"
                      onClick={() => setActiveTab("home")}
                    >
                      Mulai Prediksi
                    </button>
                  </div>
                )}

              {!isLoadingHistory &&
                !historyError &&
                filteredHistory.length > 0 && (
                  <div className="history-list">
                    {filteredHistory.map((item) => {
                      const itemInfo = getClassInfo(item.predicted_class);
                      const itemConfidence = Number(item.confidence || 0);
                      const isOpen = selectedHistoryId === item.id;
                      const itemResult = {
                        predicted_class: item.predicted_class,
                        confidence: itemConfidence,
                        probabilities: item.probabilities || {},
                      };
                      const imageForExport =
                        item.image_thumbnail_url ||
                        item.image_processed_url ||
                        "";
                      return (
                        <div className="history-wrapper" key={item.id}>
                          <div className="history-item">
                            <button
                              className="history-main"
                              onClick={() => openHistoryItem(item)}
                            >
                              {item.image_thumbnail_url ? (
                                <img
                                  src={item.image_thumbnail_url}
                                  alt={itemInfo.title}
                                />
                              ) : (
                                <div className="gallery-placeholder history-thumb-placeholder">
                                  <span>🖼️</span>
                                </div>
                              )}

                              <div className="history-info">
                                <b>{itemInfo.title}</b>
                                <span>{itemInfo.status}</span>
                                <small>
                                  {formatDateTime(item.created_at)} •{" "}
                                  {getSourceLabel(item.input_source)}
                                </small>
                              </div>

                              <div className="history-confidence">
                                {itemConfidence.toFixed(1)}%
                              </div>
                            </button>
                          </div>

                          {isOpen && (
                            <div
                              className={`history-detail result-${itemInfo.color}`}
                            >
                              {imageForExport ? (
                                <img
                                  src={imageForExport}
                                  alt={itemInfo.title}
                                  className="history-detail-image"
                                />
                              ) : (
                                <div className="gallery-placeholder">
                                  <span>🖼️</span>
                                  <p>Gambar tidak tersedia</p>
                                </div>
                              )}

                              <div className="result-top">
                                <div className="result-icon">
                                  {itemInfo.icon}
                                </div>
                                <div>
                                  <p className="result-label">
                                    Detail Prediksi
                                  </p>
                                  <h2>{itemInfo.title}</h2>
                                </div>
                              </div>

                              <div className="status-pill">
                                {itemInfo.status}
                              </div>

                              <div className="confidence-box">
                                <span>Confidence</span>
                                <b>{itemConfidence.toFixed(2)}%</b>
                                <small>
                                  {getConfidenceStatus(itemConfidence)}
                                </small>
                              </div>

                              <div className="scan-meta">
                                <span>
                                  📅 {formatDateTime(item.created_at)}
                                </span>
                                <span>
                                  📷 {getSourceLabel(item.input_source)}
                                </span>
                              </div>

                              <div className="recommendation-box">
                                <b>Rekomendasi</b>
                                <p>{itemInfo.description}</p>
                              </div>

                              <div className="recommendation-box">
                                <b>Kenapa hasil ini muncul?</b>
                                <p>{itemInfo.reason}</p>
                              </div>

                              <div className="recommendation-box">
                                <b>Saran tindakan</b>
                                <p>{itemInfo.action}</p>
                              </div>

                              <div className="prob-list">
                                {Object.entries(item.probabilities || {}).map(
                                  ([label, value]) => {
                                    const percent = Number(value || 0);

                                    return (
                                      <div
                                        className="prob-bar-item"
                                        key={label}
                                      >
                                        <div className="prob-bar-top">
                                          <span>
                                            {getClassInfo(label).title}
                                          </span>
                                          <b>{percent.toFixed(2)}%</b>
                                        </div>

                                        <div className="prob-track">
                                          <div
                                            className="prob-fill"
                                            style={{
                                              width: `${Math.min(percent, 100)}%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>

                              <div className="export-grid">
                                {imageForExport && (
                                  <button
                                    className="secondary-btn"
                                    onClick={() =>
                                      exportAsImage(
                                        itemResult,
                                        imageForExport,
                                        getSourceLabel(item.input_source),
                                      )
                                    }
                                  >
                                    📥 Simpan Gambar
                                  </button>
                                )}

                                {imageForExport && (
                                  <button
                                    className="secondary-btn"
                                    onClick={() =>
                                      exportAsPDF(
                                        itemResult,
                                        imageForExport,
                                        getSourceLabel(item.input_source),
                                      )
                                    }
                                  >
                                    📄 Export PDF
                                  </button>
                                )}

                                {item.image_processed_url && (
                                  <a
                                    href={item.image_processed_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="history-link-btn"
                                  >
                                    🖼️ Lihat Gambar Asli
                                  </a>
                                )}
                              </div>

                              <button
                                className="close-detail-btn close-detail-bottom"
                                onClick={() => setSelectedHistoryId(null)}
                              >
                                ✕ Tutup Detail
                              </button>
                              <button
                                className="delete-detail-btn"
                                onClick={() => deletePredictionHistory(item.id)}
                              >
                                🗑️ Hapus Riwayat Ini
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              {hasMoreHistory && historyFilter === "all" && (
                <button
                  className="load-more-history-btn"
                  onClick={() => fetchPredictionHistory({ reset: false })}
                  disabled={isLoadingMoreHistory}
                >
                  {isLoadingMoreHistory
                    ? "Memuat data..."
                    : "Muat Riwayat Lagi"}
                </button>
              )}
            </section>
          </>
        )}

        {activeTab === "profile" && (
          <>
            <section className="profile-hero">
              <div className="profile-avatar">
                {currentUser?.name
                  ? currentUser.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"}
              </div>

              <p className="eyebrow light">Profil Pengguna</p>
              <h1>{currentUser?.name || "User"}</h1>
              <p>{currentUser?.email || "-"}</p>

              <div className="profile-status-row">
                <span className="profile-status verified">
                  ✅{" "}
                  {currentUser?.is_verified
                    ? "Email Verified"
                    : "Belum Verified"}
                </span>

                <span className="profile-status role">
                  👤 {currentUser?.role || "user"}
                </span>
              </div>
            </section>
            <section className="profile-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Informasi Akun</p>
                  <h2>Edit Profile</h2>
                </div>

                <span className="mini-badge">✏️</span>
              </div>

              <form
                className="auth-form profile-password-form"
                onSubmit={handleUpdateProfile}
              >
                <label>
                  Nama Lengkap
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileInputChange}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileInputChange}
                    required
                  />
                </label>

                {profileError && (
                  <div className="auth-error">⚠️ {profileError}</div>
                )}

                {profileMessage && (
                  <div className="auth-success">✅ {profileMessage}</div>
                )}

                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={profileSaving}
                >
                  {profileSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            </section>
            <section className="profile-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Informasi Akun</p>
                  <h2>Detail Profile</h2>
                </div>
                <span className="mini-badge">🔐</span>
              </div>

              <div className="profile-info-list">
                <div>
                  <span>Nama</span>
                  <b>{currentUser?.name || "-"}</b>
                </div>

                <div>
                  <span>Email</span>
                  <b>{currentUser?.email || "-"}</b>
                </div>

                <div>
                  <span>Role</span>
                  <b>{currentUser?.role || "user"}</b>
                </div>

                <div>
                  <span>Status Akun</span>
                  <b>{currentUser?.is_active ? "Aktif" : "Tidak Aktif"}</b>
                </div>

                <div>
                  <span>Status Email</span>
                  <b>
                    {currentUser?.is_verified
                      ? "Terverifikasi"
                      : "Belum Terverifikasi"}
                  </b>
                </div>

                <div>
                  <span>Tanggal Daftar</span>
                  <b>{formatDateTime(currentUser?.created_at)}</b>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Keamanan</p>
                  <h2>Ubah Password</h2>
                </div>
                <span className="mini-badge">🛡️</span>
              </div>

              <form
                className="auth-form profile-password-form"
                onSubmit={handleChangePasswordSubmit}
              >
                <label>
                  Password Lama
                  <input
                    type="password"
                    name="oldPassword"
                    value={changePasswordForm.oldPassword}
                    onChange={handleChangePasswordInput}
                    placeholder="Masukkan password lama"
                    minLength={6}
                    required
                  />
                </label>

                <label>
                  Password Baru
                  <input
                    type="password"
                    name="newPassword"
                    value={changePasswordForm.newPassword}
                    onChange={handleChangePasswordInput}
                    placeholder="Masukkan password baru"
                    minLength={6}
                    required
                  />
                </label>

                <label>
                  Konfirmasi Password Baru
                  <input
                    type="password"
                    name="confirmPassword"
                    value={changePasswordForm.confirmPassword}
                    onChange={handleChangePasswordInput}
                    placeholder="Ulangi password baru"
                    minLength={6}
                    required
                  />
                </label>

                {changePasswordError && (
                  <div className="auth-error">⚠️ {changePasswordError}</div>
                )}

                {changePasswordSuccess && (
                  <div className="auth-success">✅ {changePasswordSuccess}</div>
                )}

                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={changePasswordLoading}
                >
                  {changePasswordLoading
                    ? "Menyimpan..."
                    : "Simpan Password Baru"}
                </button>
              </form>
            </section>

            <section className="profile-card danger-profile-card">
              <div>
                <p className="result-label">Sesi Login</p>
                <h2>Keluar Akun</h2>
                <p>
                  Gunakan tombol ini untuk keluar dari akun dan menghapus sesi
                  login di perangkat ini.
                </p>
              </div>

              <button className="danger-btn full" onClick={handleLogout}>
                🚪 Logout
              </button>
            </section>
          </>
        )}

        {activeTab === "admin" && currentUser?.role === "admin" && (
          <>
            <section className="admin-hero">
              <div className="admin-hero-glow"></div>
              <div className="admin-logo">⚙️</div>
              <p className="eyebrow light">Admin Dashboard</p>
              <h1>Kontrol Sistem</h1>
              <p>
                Pantau user, riwayat prediksi, dan status sistem SawitVision AI
                secara global.
              </p>

              <button
                className="admin-refresh-btn"
                onClick={() => {
                  fetchAdminStats();
                  fetchAdminUsers();
                  fetchAdminStorage();
                  fetchAdminActivityLogs({ page: 1, reset: true });
                }}
                disabled={
                  adminLoading ||
                  adminUsersLoading ||
                  adminStorageLoading ||
                  adminStorageCleanupLoading ||
                  adminActivityLoading
                }
              >
                {adminLoading ||
                adminUsersLoading ||
                adminStorageLoading ||
                adminStorageCleanupLoading ||
                adminActivityLoading
                  ? "Memuat..."
                  : "Refresh Data"}
              </button>
            </section>

            {adminError && (
              <section className="admin-alert-card">
                <b>⚠️ Admin Error</b>
                <p>{adminError}</p>
              </section>
            )}

            <section className="admin-grid-stats">
              <div className="admin-stat-card highlight">
                <span>👥</span>
                <small>Total User</small>
                <b>{adminLoading ? "..." : (adminStats?.users?.total ?? 0)}</b>
              </div>

              <div className="admin-stat-card">
                <span>✅</span>
                <small>User Aktif</small>
                <b>{adminLoading ? "..." : (adminStats?.users?.active ?? 0)}</b>
              </div>

              <div className="admin-stat-card">
                <span>📧</span>
                <small>Email Verified</small>
                <b>
                  {adminLoading ? "..." : (adminStats?.users?.verified ?? 0)}
                </b>
              </div>

              <div className="admin-stat-card highlight-orange">
                <span>📊</span>
                <small>Total Prediksi</small>
                <b>
                  {adminLoading ? "..." : (adminStats?.predictions?.total ?? 0)}
                </b>
              </div>
            </section>

            <section className="admin-card storage-admin-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Monitoring Storage</p>
                  <h2>Penyimpanan Aplikasi</h2>
                </div>

                <span className="mini-badge">💾</span>
              </div>

              {adminStorageLoading ? (
                <div className="admin-empty-mini">
                  <div className="spinner"></div>
                  <p>Memuat statistik storage...</p>
                </div>
              ) : !adminStorage ? (
                <div className="admin-empty-mini">
                  <span>📭</span>
                  <p>Data storage belum tersedia.</p>
                </div>
              ) : (
                <>
                  <div
                    className={`storage-status ${
                      adminStorage.status || "safe"
                    }`}
                  >
                    <span>
                      {adminStorage.status === "critical"
                        ? "🚨"
                        : adminStorage.status === "warning"
                          ? "⚠️"
                          : "✅"}
                    </span>

                    <div>
                      <b>
                        {adminStorage.message ||
                          "Penggunaan storage masih aman."}
                      </b>
                      <small>
                        Estimasi penggunaan berdasarkan data prediksi.
                      </small>
                    </div>
                  </div>

                  <div className="storage-percentage-row">
                    <span>Storage Terpakai</span>
                    <b>{adminStorage.usage?.percentage ?? 0}%</b>
                  </div>

                  <div className="storage-progress">
                    <div
                      className={`storage-progress-fill ${
                        adminStorage.status || "safe"
                      }`}
                      style={{
                        width: `${Math.min(
                          Number(adminStorage.usage?.percentage || 0),
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="storage-grid">
                    <div>
                      <span>Terpakai</span>
                      <b>{adminStorage.usage?.estimated_mb ?? 0} MB</b>
                    </div>

                    <div>
                      <span>Sisa</span>
                      <b>{adminStorage.remaining?.gb ?? 0} GB</b>
                    </div>

                    <div>
                      <span>Batas Internal</span>
                      <b>{adminStorage.limit?.gb ?? 0} GB</b>
                    </div>

                    <div>
                      <span>Total File</span>
                      <b>{adminStorage.files?.total_storage_objects ?? 0}</b>
                    </div>

                    <div>
                      <span>Processed</span>
                      <b>{adminStorage.files?.processed_images ?? 0}</b>
                    </div>

                    <div>
                      <span>Thumbnail</span>
                      <b>{adminStorage.files?.thumbnail_images ?? 0}</b>
                    </div>
                  </div>

                  <div className="storage-cleanup-panel">
                    <div className="storage-cleanup-copy">
                      <b>Bersihkan gambar lama</b>
                      <small>
                        File gambar akan dihapus dari Supabase, tetapi data
                        hasil klasifikasi tetap tersimpan di riwayat.
                      </small>
                    </div>

                    <div className="storage-cleanup-controls">
                      <label htmlFor="storage-cleanup-limit">
                        Jumlah record
                      </label>

                      <select
                        id="storage-cleanup-limit"
                        value={adminStorageCleanupLimit}
                        onChange={(event) =>
                          setAdminStorageCleanupLimit(
                            Number(event.target.value),
                          )
                        }
                        disabled={adminStorageCleanupLoading}
                      >
                        <option value={10}>10 gambar lama</option>
                        <option value={25}>25 gambar lama</option>
                        <option value={50}>50 gambar lama</option>
                      </select>

                      <button
                        type="button"
                        className="storage-cleanup-btn"
                        onClick={handleAdminStorageCleanup}
                        disabled={
                          adminStorageCleanupLoading ||
                          (adminStorage.files?.total_storage_objects ?? 0) === 0
                        }
                      >
                        {adminStorageCleanupLoading
                          ? "Membersihkan..."
                          : "Bersihkan Gambar Lama"}
                      </button>
                    </div>

                    {adminStorageCleanupMessage && (
                      <div className="storage-cleanup-feedback success">
                        ✅ {adminStorageCleanupMessage}
                      </div>
                    )}

                    {adminStorageCleanupError && (
                      <div className="storage-cleanup-feedback error">
                        ⚠️ {adminStorageCleanupError}
                      </div>
                    )}
                  </div>

                  <p className="storage-note">
                    Nilai penggunaan merupakan estimasi internal aplikasi dan
                    dapat berbeda dengan angka resmi pada dashboard Supabase
                    Storage.
                  </p>
                </>
              )}
            </section>

            <section className="admin-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Distribusi Global</p>
                  <h2>Prediksi Semua User</h2>
                </div>
                <span className="mini-badge">🌾</span>
              </div>

              <div className="admin-class-grid">
                {["belum_masak", "masak", "terlalu_masak"].map((className) => {
                  const itemInfo = getClassInfo(className);
                  const classData =
                    adminStats?.predictions?.by_class?.[className];

                  return (
                    <div
                      className={`admin-class-card ${itemInfo.color}`}
                      key={className}
                    >
                      <div>
                        <span>{itemInfo.icon}</span>
                        <b>{itemInfo.title}</b>
                      </div>
                      <strong>{classData?.total ?? 0}</strong>
                      <small>
                        Avg Confidence{" "}
                        {Number(classData?.avg_confidence || 0).toFixed(1)}%
                      </small>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="admin-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Aktivitas Terbaru</p>
                  <h2>Recent Predictions</h2>
                </div>
                <span className="mini-badge">🧾</span>
              </div>

              <div className="admin-recent-list">
                {(adminStats?.predictions?.recent || []).length === 0 ? (
                  <div className="admin-empty-mini">
                    <span>📭</span>
                    <p>Belum ada prediksi terbaru.</p>
                  </div>
                ) : (
                  adminStats.predictions.recent.map((item) => {
                    const itemInfo = getClassInfo(item.predicted_class);

                    return (
                      <div className="admin-recent-item" key={item.id}>
                        <div className="admin-recent-icon">{itemInfo.icon}</div>
                        <div>
                          <b>{itemInfo.title}</b>
                          <span>
                            {item.user_name} • {item.user_email}
                          </span>
                          <small>{formatDateTime(item.created_at)}</small>
                        </div>
                        <strong>
                          {Number(item.confidence || 0).toFixed(1)}%
                        </strong>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="admin-card admin-activity-section">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Audit Sistem</p>
                  <h2>Activity Log</h2>
                </div>
                <span className="mini-badge">🛡️</span>
              </div>

              <form
                className="admin-activity-toolbar"
                onSubmit={handleAdminActivitySearch}
              >
                <input
                  type="search"
                  value={adminActivitySearchInput}
                  onChange={(event) =>
                    setAdminActivitySearchInput(event.target.value)
                  }
                  placeholder="Cari nama, email, atau aktivitas..."
                  aria-label="Cari activity log"
                />

                <select
                  value={adminActivityFilter}
                  onChange={handleAdminActivityFilter}
                  aria-label="Filter jenis aktivitas"
                >
                  <option value="">Semua aktivitas</option>
                  <option value="REGISTER">Registrasi</option>
                  <option value="LOGIN">Login berhasil</option>
                  <option value="LOGIN_FAILED">Login gagal</option>
                  <option value="VERIFY_EMAIL">Verifikasi email</option>
                  <option value="FORGOT_PASSWORD">Lupa password</option>
                  <option value="RESET_PASSWORD">Reset password</option>
                  <option value="CHANGE_PASSWORD">Ganti password</option>
                  <option value="CREATE_PREDICTION">Prediksi</option>
                  <option value="DELETE_HISTORY">Hapus riwayat</option>
                  <option value="ADMIN_ACTIVATE_USER">Aktifkan user</option>
                  <option value="ADMIN_DEACTIVATE_USER">
                    Nonaktifkan user
                  </option>
                </select>

                <button type="submit" className="admin-activity-search-btn">
                  🔎 Cari
                </button>

                {(adminActivitySearch || adminActivityFilter) && (
                  <button
                    type="button"
                    className="admin-activity-reset-btn"
                    onClick={() => {
                      setAdminActivitySearchInput("");
                      setAdminActivitySearch("");
                      setAdminActivityFilter("");
                      fetchAdminActivityLogs({
                        page: 1,
                        reset: true,
                        action: "",
                        search: "",
                      });
                    }}
                  >
                    Reset
                  </button>
                )}
              </form>

              {adminActivityError && (
                <div className="admin-activity-error">
                  ⚠️ {adminActivityError}
                </div>
              )}

              {adminActivityLoading ? (
                <div className="admin-empty-mini">
                  <div className="spinner"></div>
                  <p>Memuat activity log...</p>
                </div>
              ) : adminActivityLogs.length === 0 ? (
                <div className="admin-empty-mini">
                  <span>📭</span>
                  <p>Tidak ada activity log yang sesuai.</p>
                </div>
              ) : (
                <>
                  <div className="admin-activity-list">
                    {adminActivityLogs.map((log) => {
                      const actionInfo = getActivityActionInfo(log.action);
                      const primaryUser = log.target_user || log.actor_user;

                      return (
                        <article className="admin-activity-item" key={log.id}>
                          <div
                            className={`admin-activity-icon ${actionInfo.tone}`}
                          >
                            {actionInfo.icon}
                          </div>

                          <div className="admin-activity-content">
                            <div className="admin-activity-heading">
                              <b>{actionInfo.label}</b>
                              <small>{formatDateTime(log.created_at)}</small>
                            </div>

                            <p>
                              {log.description || "Aktivitas sistem tercatat."}
                            </p>

                            <div className="admin-activity-meta">
                              <span>
                                👤{" "}
                                {primaryUser?.name ||
                                  "Pengguna tidak diketahui"}
                              </span>
                              <span>✉️ {primaryUser?.email || "-"}</span>
                              <span>
                                🌐 {log.ip_address || "IP tidak tersedia"}
                              </span>
                            </div>

                            {log.actor_user &&
                              log.target_user &&
                              log.actor_user.id !== log.target_user.id && (
                                <small className="admin-activity-actor">
                                  Dilakukan oleh:{" "}
                                  {log.actor_user.name || "Admin"} (
                                  {log.actor_user.email || "-"})
                                </small>
                              )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="admin-activity-pagination">
                    <small>
                      Halaman {adminActivityPage} dari {adminActivityTotalPages}
                    </small>

                    {adminActivityHasMore && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchAdminActivityLogs({
                            page: adminActivityPage + 1,
                            reset: false,
                          })
                        }
                        disabled={adminActivityLoadingMore}
                      >
                        {adminActivityLoadingMore
                          ? "Memuat..."
                          : "Muat Log Berikutnya"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="admin-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Manajemen User</p>
                  <h2>Daftar Pengguna</h2>
                </div>
                <span className="mini-badge">👤</span>
              </div>

              {adminUsersLoading ? (
                <div className="admin-empty-mini">
                  <div className="spinner"></div>
                  <p>Memuat daftar user...</p>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="admin-empty-mini">
                  <span>📭</span>
                  <p>Belum ada user.</p>
                </div>
              ) : (
                <div className="admin-user-list">
                  {adminUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isLoadingAction = adminActionLoadingId === user.id;

                    return (
                      <div className="admin-user-item" key={user.id}>
                        <div className="admin-user-avatar">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "U"}
                        </div>

                        <div className="admin-user-main">
                          <b>{user.name || "User"}</b>
                          <span>{user.email}</span>

                          <div className="admin-user-badges">
                            <small
                              className={
                                user.role === "admin"
                                  ? "admin-badge role-admin"
                                  : "admin-badge"
                              }
                            >
                              {user.role}
                            </small>
                            <small
                              className={
                                user.is_verified
                                  ? "admin-badge verified"
                                  : "admin-badge muted"
                              }
                            >
                              {user.is_verified ? "Verified" : "Unverified"}
                            </small>
                            <small
                              className={
                                user.is_active
                                  ? "admin-badge active"
                                  : "admin-badge inactive"
                              }
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </small>
                          </div>
                        </div>

                        <div className="admin-user-side">
                          <small>{user.total_predictions || 0} prediksi</small>
                          <button
                            className={
                              user.is_active
                                ? "admin-action-btn danger"
                                : "admin-action-btn success"
                            }
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={isSelf || isLoadingAction}
                            title={
                              isSelf
                                ? "Tidak bisa ubah status akun sendiri"
                                : "Ubah status user"
                            }
                          >
                            {isLoadingAction
                              ? "..."
                              : user.is_active
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "about" && (
          <>
            <section className="about-premium-hero">
              <div className="about-glow"></div>

              <div className="about-logo-premium">
                <span>🌴</span>
              </div>

              <p className="eyebrow light">Tentang Aplikasi</p>
              <h1>SawitVision AI</h1>
              <p>
                Aplikasi klasifikasi tingkat kematangan buah kelapa sawit
                berbasis citra digital dan Deep Learning.
              </p>

              <div className="version-pill">Versi 1.0.0</div>
            </section>

            <section className="about-card premium-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Profil Sistem</p>
                  <h2>Informasi Aplikasi</h2>
                </div>
                <span className="mini-badge">AI</span>
              </div>

              <div className="premium-info-grid">
                <div>
                  <span>Model AI</span>
                  <b>EfficientNetV2S</b>
                </div>

                <div>
                  <span>Metode</span>
                  <b>Deep Learning</b>
                </div>

                <div>
                  <span>Jenis Tugas</span>
                  <b>Klasifikasi Citra</b>
                </div>

                <div>
                  <span>Input</span>
                  <b>Kamera & Galeri</b>
                </div>

                <div>
                  <span>Kelas</span>
                  <b>Belum Masak, Masak, Terlalu Masak</b>
                </div>

                <div>
                  <span>Output</span>
                  <b>Label, Confidence, Probabilitas, Rekomendasi</b>
                </div>
              </div>
            </section>

            <section className="about-card developer-premium-card">
              <div className="developer-cover"></div>

              <div className="developer-profile">
                <div className="developer-avatar-premium">MF</div>

                <div>
                  <p className="result-label">Developer</p>
                  <h2>Muhammad Ferdy Oktavian</h2>
                  <p>
                    Pengembang aplikasi klasifikasi kematangan buah kelapa sawit
                    menggunakan model EfficientNetV2S dan teknologi web modern.
                  </p>
                </div>
              </div>

              <div className="developer-tags">
                <span>React</span>
                <span>FastAPI</span>
                <span>TensorFlow</span>
                <span>Computer Vision</span>
              </div>
            </section>

            <section className="about-card premium-card">
              <div className="section-title-row">
                <div>
                  <p className="result-label">Tujuan</p>
                  <h2>Manfaat Aplikasi</h2>
                </div>
                <span className="mini-badge">🌾</span>
              </div>

              <div className="benefit-list">
                <div>
                  <span>01</span>
                  <p>
                    Membantu proses identifikasi tingkat kematangan buah sawit.
                  </p>
                </div>

                <div>
                  <span>02</span>
                  <p>Memberikan hasil prediksi berupa label dan confidence.</p>
                </div>

                <div>
                  <span>03</span>
                  <p>
                    Menyediakan rekomendasi awal berdasarkan hasil klasifikasi.
                  </p>
                </div>
              </div>
            </section>

            <section className="about-note-card">
              <b>Catatan Penggunaan</b>
              <p>
                Hasil prediksi digunakan sebagai alat bantu awal. Keputusan
                lapangan tetap perlu mempertimbangkan kondisi buah secara
                langsung, pencahayaan, jarak pengambilan gambar, dan pengalaman
                pengguna di lapangan.
              </p>
            </section>
          </>
        )}

        <div className="bottom-nav-spacer"></div>

        <nav
          className={
            currentUser?.role === "admin"
              ? "bottom-nav admin-nav"
              : "bottom-nav"
          }
        >
          <button
            className={activeTab === "home" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("home")}
          >
            🏠
            <span>Home</span>
          </button>

          <button
            className={activeTab === "history" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("history")}
          >
            📊
            <span>History</span>
          </button>

          <button
            className={activeTab === "profile" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("profile")}
          >
            👤
            <span>Profile</span>
          </button>

          {currentUser?.role === "admin" && (
            <button
              className={activeTab === "admin" ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab("admin")}
            >
              ⚙️
              <span>Admin</span>
            </button>
          )}

          <button
            className={activeTab === "about" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("about")}
          >
            ℹ️
            <span>About</span>
          </button>
        </nav>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </main>
    </div>
  );
}

export default App;
