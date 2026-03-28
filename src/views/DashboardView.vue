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
          <button @click="prosesAbsen('in')" :disabled="isLoading" class="btn-absen btn-masuk">
            <span v-if="!isLoading || actionType !== 'in'">Masuk (Clock In)</span>
            <span v-else>Memproses...</span>
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
            <span class="month-badge">{{ new Date().toLocaleString('id-ID', { month: 'long' }) }}</span>
          </div>

          <div v-if="historyData.length === 0" class="empty-history">
            Belum ada data absensi bulan ini.
          </div>

          <div v-else class="table-responsive">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in historyData" :key="item.id">
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, // Minta akurasi tinggi
      );
    }
  });
};

// Fungsi untuk menembak API Laravel (Absen Masuk & Keluar)
const prosesAbsen = async (type) => {
  isLoading.value = true;
  actionType.value = type;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const coords = await getGPSLocation();
    const token = localStorage.getItem("token");
    const endpoint = type === "in" ? "/attendance/clock-in" : "/attendance/clock-out";

    const response = await axios.post(
      import.meta.env.VITE_API_URL + endpoint,
      coords,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    successMessage.value = response.data.message;
    fetchHistory(); // Refresh history setelah absen berhasil!

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
</style>
