<template>
  <div class="dashboard-layout">
    <nav class="navbar">
      <div class="nav-brand">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          class="nav-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>HadirLah!</span>
      </div>
      <button @click="handleLogout" class="btn-logout">Logout</button>
    </nav>

    <main class="main-content">
      <div class="welcome-card">
        <h2>Dashboard Absensi</h2>
        <p>
          Pastikan GPS Anda aktif dan berikan izin akses lokasi pada browser
          sebelum melakukan absensi.
        </p>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>
        <div class="clock-section">
          <h1 class="digital-clock">{{ currentTime }}</h1>
          <p class="date-display">{{ currentDate }}</p>
          <div class="timezone-badges">
            <span :class="['badge', activeZone === 'WIB' ? 'active' : '']">WIB</span>
            <span :class="['badge', activeZone === 'WITA' ? 'active' : '']">WITA</span>
            <span :class="['badge', activeZone === 'WIT' ? 'active' : '']">WIT</span>
          </div>
        </div>

        <div class="action-buttons">
          <div v-if="isCameraOpen" class="camera-wrapper">
            <video ref="videoRef" autoplay playsinline class="video-preview"></video>
            <canvas ref="canvasRef" style="display: none;"></canvas>

            <div class="camera-actions">
              <button @click="capturePhoto" class="btn-snap">📸 Ambil Foto & Absen</button>
              <button @click="closeCamera" class="btn-cancel-cam">Batal</button>
            </div>
          </div>
          <button @click="openCamera('in')" :disabled="isLoading || isCameraOpen" class="btn-absen btn-masuk">
            Masuk (Clock In)
          </button>

          <button @click="prosesAbsen('out')" :disabled="isLoading" class="btn-absen btn-keluar">
            <span v-if="!isLoading || actionType !== 'out'">Keluar (Clock Out)</span>
            <span v-else>Memproses...</span>
          </button>
        </div>

        <div v-if="isLoading" class="loading-text">
          Sedang mengambil titik koordinat GPS Anda...
        </div>

        <div class="history-section">
          <div class="history-header">
            <h3>Riwayat Absen Bulan Ini</h3>
            <div class="filter-group">
              <select v-model="filterBulan" @change="fetchHistory" class="select-filter">
                <option v-for="(name, index) in daftarBulan" :key="index" :value="index + 1">
                  {{ name }}
                </option>
              </select>

              <select v-model="filterTahun" @change="fetchHistory" class="select-filter">
                <option v-for="year in daftarTahun" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
            <!-- <span class="month-badge">{{ new Date().toLocaleString('id-ID', { month: 'long' }) }}</span> -->
          </div>

          <div v-if="historyData.length === 0" class="empty-history">
            Belum ada data absensi bulan ini.
          </div>

          <div v-else class="table-responsive">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Tanggal</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in historyData" :key="item.id">
                  <td>
                    <img v-if="item.image" :src="item.image" alt="Bukti Absen" class="history-photo"
                      @click="showFullPhoto(item.image, item)" />
                    <span v-else class="no-photo">-</span>
                  </td>
                  <td class="td-date">{{ formatDate(item.date) }}</td>
                  <td class="td-time">{{ item.clock_in_time || '--:--' }}</td>
                  <td class="td-time">{{ item.clock_out_time || '--:--' }}</td>
                  <td>
                    <span :class="['status-pill', item.clock_out_time ? 'complete' : 'incomplete']">
                      {{ item.clock_out_time ? 'Selesai' : 'Aktif' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
    <Transition name="fade">
      <div v-if="selectedPhoto" class="photo-modal-overlay" @click="closePhotoModal">
        <div class="photo-modal-content" @click.stop> <button @click="closePhotoModal"
            class="btn-close-modal">&times;</button>
          <img :src="selectedPhoto" alt="Preview Foto Absen" class="full-photo-view" />
          <div class="photo-meta">
            {{ currentDateModal }} | {{ currentTimeModal }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const isLoading = ref(false);
const actionType = ref(""); // Menyimpan status tombol mana yang ditekan ('in' atau 'out')
const successMessage = ref("");
const errorMessage = ref("");
const currentTime = ref("--:--:--");
const currentDate = ref("Memuat tanggal...");
const activeZone = ref('WIB');
const isCameraOpen = ref(false);
const videoRef = ref(null);
const canvasRef = ref(null);
const stream = ref(null);
const selectedPhoto = ref(null); // Menyimpan URL Base64 foto yang dipilih
const currentDateModal = ref(""); // Menyimpan tanggal saat foto diklik
const currentTimeModal = ref(""); // Menyimpan jam saat foto diklik
const filterBulan = ref(new Date().getMonth() + 1); // Default bulan sekarang
const filterTahun = ref(new Date().getFullYear()); // Default tahun sekarang

const openCamera = async (type) => {
  actionType.value = type; // 'in' atau 'out'
  isCameraOpen.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // Kamera depan
      audio: false
    });
    videoRef.value.srcObject = stream.value;
  } catch (err) {
    errorMessage.value = "Kamera tidak diizinkan atau tidak ditemukan.";
    isCameraOpen.value = false;
  }
};

const daftarBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const daftarTahun = computed(() => {
  const year = new Date().getFullYear();
  return [year, year - 1, year - 2];
});



const showFullPhoto = (photoBase64, attendanceRecord) => {
  selectedPhoto.value = photoBase64;

  // Set meta data agar karyawan tahu kapan foto ini diambil
  currentDateModal.value = formatDateFull(attendanceRecord.date);
  currentTimeModal.value = attendanceRecord.clock_in_time;

  // Opsional: Matikan scroll body agar rapi
  document.body.style.overflow = 'hidden';
};

// 2. Fungsi Menutup Modal
const closePhotoModal = () => {
  selectedPhoto.value = null;
  // Kembalikan scroll body
  document.body.style.overflow = 'auto';
};

// Fungsi Helper Format Tanggal Lengkap untuk Modal
const formatDateFull = (dateString) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// 2. Fungsi Ambil Foto + Watermark
const capturePhoto = () => {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  const context = canvas.getContext("2d");

  // Set ukuran canvas sama dengan video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // A. Gambar foto asli
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // B. Tambahkan Watermark "Hadirlah! App"
  context.fillStyle = "white";
  context.shadowColor = "black";
  context.shadowBlur = 7;
  context.font = "bold 30px sans-serif";
  context.fillText("Hadirlah! App", 20, canvas.height - 60);

  // C. Tambahkan Jam & Tanggal di Watermark
  context.font = "20px sans-serif";
  const info = `${currentDate.value} | ${currentTime.value} (${activeZone.value})`;
  context.fillText(info, 20, canvas.height - 30);

  // D. Convert ke Base64 (Format Gambar)
  const imageData = canvas.toDataURL("image/jpeg", 0.7); // 0.7 = kualitas 70% agar file tidak kegedean

  closeCamera();
  prosesAbsen(actionType.value, imageData); // Kirim ke fungsi absen
};

// 3. Fungsi Tutup Kamera
const closeCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
  isCameraOpen.value = false;
};


const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'short' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// --- TAHAP 5: Tambahkan penampung history ---
const historyData = ref([]);

const updateTime = () => {
  const now = new Date();

  // Format Waktu (HH:mm:ss)
  currentTime.value = now.toLocaleTimeString('en-GB');

  // Format Tanggal Indonesia
  currentDate.value = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Logika Penentuan Zona (Berdasarkan Offset Browser)
  const offset = now.getTimezoneOffset() / -60;
  if (offset === 8) activeZone.value = 'WITA';
  else if (offset === 9) activeZone.value = 'WIT';
  else activeZone.value = 'WIB';
};

// Fungsi ambil history absen (Persiapan Fitur 5)
const fetchHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(import.meta.env.VITE_API_URL + '/attendance/history', {
      params: {
        bulan: filterBulan.value,
        tahun: filterTahun.value
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    historyData.value = response.data;
    console.log("Data History Berhasil Diambil:", historyData.value);
  } catch (error) {
    console.error("Gagal mengambil history:", error);
  }
};

let timer;
onMounted(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/");
  } else {
    updateTime();
    timer = setInterval(updateTime, 1000);
    fetchHistory(); // Ambil history saat pertama buka
  }
});

onUnmounted(() => {
  clearInterval(timer);
});

const handleLogout = () => {
  localStorage.removeItem("token");
  router.push("/");
};

// Fungsi inti untuk mengambil GPS menggunakan API Browser bawaan (HTML5 Geolocation)
const getGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Browser Anda tidak mendukung fitur GPS/Geolokasi.");
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // Tangani penolakan izin atau error GPS
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(
                "Anda menolak permintaan akses lokasi. Mohon izinkan akses GPS di pengaturan browser.",
              );
              break;
            case error.POSITION_UNAVAILABLE:
              reject("Informasi lokasi tidak tersedia saat ini.");
              break;
            case error.TIMEOUT:
              reject("Waktu permintaan lokasi habis (Timeout).");
              break;
            default:
              reject(
                "Terjadi kesalahan yang tidak diketahui saat mengambil lokasi.",
              );
              break;
          }
        },
        {
          enableHighAccuracy: false, // Ubah jadi false agar lebih cepat mengambil titik kasar
          timeout: 5000,             // Percepat timeout jadi 5 detik
          maximumAge: 0
        }
      );
    }
  });
};

// Fungsi untuk menembak API Laravel (Absen Masuk & Keluar)
const prosesAbsen = async (type, photoBase64 = null) => {
  isLoading.value = true;
  actionType.value = type;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    // 1. Ambil Koordinat GPS
    const coords = await getGPSLocation();

    // 2. Siapkan Token
    const token = localStorage.getItem("token");
    const endpoint = type === "in" ? "/attendance/clock-in" : "/attendance/clock-out";

    // 3. Tembak API Laravel
    const response = await axios.post(
      import.meta.env.VITE_API_URL + endpoint,
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        image: photoBase64, // Pastikan variabel ini terkirim di sini!
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    // 4. Jika sukses
    successMessage.value = response.data.message;
    fetchHistory(); // Refresh tabel history

  } catch (error) {
    if (typeof error === "string") {
      errorMessage.value = error;
    } else if (error.response && error.response.data) {
      errorMessage.value = error.response.data.message;
    } else {
      errorMessage.value = "Gagal terhubung ke server.";
    }
  } finally {
    isLoading.value = false;
    actionType.value = "";
  }
};
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background-color: #f3f4f6;
  font-family: "Inter", sans-serif;
}

.navbar {
  background-color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.25rem;
  color: #4f46e5;
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.btn-logout {
  background-color: transparent;
  color: #dc2626;
  border: 1px solid #dc2626;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #fef2f2;
}

.main-content {
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.welcome-card {
  background: white;
  padding: 2.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  text-align: center;
}

.welcome-card h2 {
  margin-top: 0;
  color: #111827;
}

.welcome-card p {
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.alert {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.alert-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-absen {
  padding: 1rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.1s;
}

.btn-absen:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-absen:active:not(:disabled) {
  transform: translateY(0);
}

.btn-absen:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-masuk {
  background-color: #10b981;
}

/* Hijau */
.btn-keluar {
  background-color: #ef4444;
}

/* Merah */

.loading-text {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
}

.clock-section {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
}

.digital-clock {
  font-size: 3rem;
  font-weight: 800;
  margin: 0;
  color: #1e293b;
  font-family: 'Courier New', Courier, monospace;
  /* Gaya digital */
}

.date-display {
  color: #64748b;
  font-weight: 500;
  margin-top: 0.5rem;
}

.timezone-badges {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  background: #e2e8f0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
}

.badge.active {
  background: #4F46E5;
  color: white;
}

.history-section {
  margin-top: 2rem;
  text-align: left;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-header h3 {
  font-size: 1.1rem;
  color: #1f2937;
  margin: 0;
}

.month-badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 0.2rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.table-responsive {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.history-table th {
  background: #f9fafb;
  padding: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  border-bottom: 2px solid #f3f4f6;
}

.history-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

.history-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e2e8f0;
  cursor: pointer;
  /* Memberi petunjuk bisa diklik */
  transition: transform 0.2s, box-shadow 0.2s;
}

.history-photo:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* --- STYLE UNTUK POPUP MODAL FOTO --- */
.photo-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  /* Latar belakang gelap */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  /* Lapisan paling atas */
  padding: 1rem;
  backdrop-filter: blur(5px);
  /* Efek blur di belakang modal */
}

.photo-modal-content {
  position: relative;
  background-color: white;
  padding: 0.5rem;
  border-radius: 1rem;
  max-width: 90%;
  max-height: 90vh;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.full-photo-view {
  max-width: 100%;
  max-height: 80vh;
  /* Foto tidak boleh lebih tinggi dari layar */
  border-radius: 0.5rem;
  object-fit: contain;
  /* Foto utuh, tidak terpotong */
}

.photo-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  padding-bottom: 0.5rem;
}

.btn-close-modal {
  position: absolute;
  top: -15px;
  right: -15px;
  background-color: #ef4444;
  /* Merah */
  color: white;
  border: none;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.btn-close-modal:hover {
  transform: scale(1.1) rotate(90deg);
  /* Efek putar saat hover */
}

/* --- TRANSISI FADE (Halus) --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.no-photo {
  color: #9ca3af;
  font-size: 0.75rem;
}

.td-date {
  font-weight: 600;
}

.td-time {
  font-family: monospace;
  font-size: 0.9rem;
}

.status-pill {
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.status-pill.complete {
  background: #d1fae5;
  color: #065f46;
}

.status-pill.incomplete {
  background: #fef3c7;
  color: #92400e;
}

.empty-history {
  padding: 2rem;
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

.camera-wrapper {
  margin-bottom: 1.5rem;
  border: 3px solid #4f46e5;
  border-radius: 1rem;
  overflow: hidden;
  background: #000;
}

.video-preview {
  width: 100%;
  display: block;
  transform: scaleX(-1);
  /* Efek mirror agar seperti selfie */
}

.camera-actions {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-snap {
  background: #4f46e5;
  color: white;
  padding: 0.8rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
}

.btn-cancel-cam {
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.select-filter {
  padding: 0.3rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-size: 0.85rem;
  color: #374151;
  background-color: white;
  cursor: pointer;
}

.select-filter:focus {
  outline: none;
  border-color: #4f46e5;
  ring: 2px solid #e0e7ff;
}
</style>
