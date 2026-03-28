<template>
  <div class="login-layout">
    <div class="form-section">
      <div class="form-container fade-in-up">
        <div class="mobile-logo-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            class="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div class="header">
          <h2>Selamat Datang Kembali! 👋</h2>
          <p>Silakan masuk untuk mencatat kehadiran Anda hari ini.</p>
        </div>

        <form @submit.prevent="handleLogin" class="form-area">
          <div class="input-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" class="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input type="email" id="email" v-model="email" placeholder="nama@perusahaan.com" required />
            </div>
          </div>

          <div class="input-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" class="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clip-rule="evenodd" />
              </svg>
              <input type="password" id="password" v-model="password" placeholder="••••••••" required />
            </div>
          </div>

          <div v-if="errorMessage" class="error-alert shake">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="error-icon">
              <path fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <button type="submit" :disabled="isLoading" class="btn-submit">
            <span v-if="!isLoading">Masuk Sekarang</span>
            <span v-else class="loading-state">
              <span class="spinner"></span> Memverifikasi...
            </span>
          </button>
        </form>
      </div>
    </div>

    <div class="visual-section fade-in">
      <div class="visual-content">
        <div class="glass-card">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="large-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>HadirLah! App</h3>
          <p>
            Sistem pencatatan kehadiran modern berbasis geolokasi. Pastikan
            lokasi Anda aktif saat melakukan absensi.
          </p>
        </div>
      </div>
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { getDeviceId } from '../utils/fingerprint';

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);
const router = useRouter();

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const deviceId = await getDeviceId();
    console.log('Device ID Anda:', deviceId);

    const response = await axios.post(
      import.meta.env.VITE_API_URL + "/login",
      {
        email: email.value,
        password: password.value,
        device_id: deviceId,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    localStorage.setItem("token", response.data.token);
    router.push("/dashboard");
  } catch (error) {
    // D. Tangkap error 403 (Device Berbeda)
    if (error.response && error.response.status === 403) {
      errorMessage.value = error.response.data.message;
    } else if (error.response && error.response.data) {
      errorMessage.value = error.response.data.message;
    } else {
      errorMessage.value = 'Koneksi ke server terputus.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* --- BASE LAYOUT --- */
.login-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: #ffffff;
}

/* --- BAGIAN KIRI (FORM) --- */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.mobile-logo-placeholder {
  display: none;
  /* Disembunyikan di desktop */
  background-color: var(--primary);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
}

.icon {
  width: 28px;
  height: 28px;
}

.header {
  margin-bottom: 2.5rem;
}

.header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 0.5rem;
  letter-spacing: -0.5px;
}

.header p {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

/* --- INPUT STYLING --- */
.form-area {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  width: 20px;
  height: 20px;
  color: #9ca3af;
  pointer-events: none;
  /* Agar klik tembus ke input */
}

.input-wrapper input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  /* Padding kiri lebih besar untuk icon */
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--text-dark);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background-color: #f9fafb;
  transition: all 0.2s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--primary);
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.input-wrapper input:focus+.input-icon,
.input-wrapper input:not(:placeholder-shown)~.input-icon {
  color: var(--primary);
}

/* --- ALERT & BUTTON --- */
.error-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #fef2f2;
  color: #dc2626;
  padding: 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #fecaca;
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.btn-submit {
  width: 100%;
  padding: 0.875rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
}

.btn-submit:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 8px -1px rgba(79, 70, 229, 0.3);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

/* --- BAGIAN KANAN (VISUAL DESKTOP) --- */
.visual-section {
  display: none;
  /* Sembunyikan di HP */
  flex: 1.2;
  background: linear-gradient(135deg, var(--primary) 0%, #312e81 100%);
  position: relative;
  overflow: hidden;
  padding: 3rem;
  color: white;
  align-items: center;
  justify-content: center;
}

.visual-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2.5rem;
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.large-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 1.5rem;
  color: #a5b4fc;
}

.glass-card h3 {
  font-size: 1.8rem;
  margin: 0 0 1rem;
  font-weight: 700;
}

.glass-card p {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #e0e7ff;
  margin: 0;
}

/* Dekorasi Abstrak */
.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0) 100%);
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

/* --- ANIMASI --- */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
}

.fade-in-up {
  animation: fadeInUp 0.7s ease-out forwards;
}

.fade-in {
  animation: fadeIn 1s ease-out forwards;
}

.shake {
  animation: shake 0.3s ease-in-out;
}

/* --- RESPONSIVE MEDIA QUERIES --- */
/* Untuk layar PC/Laptop (Lebar di atas 900px) */
@media (min-width: 900px) {
  .visual-section {
    display: flex;
    /* Tampilkan bagian visual */
  }
}

/* Untuk layar HP/Tablet (Lebar di bawah 900px) */
@media (max-width: 899px) {
  .mobile-logo-placeholder {
    display: flex;
    /* Tampilkan logo kotak kecil di HP */
  }

  .form-section {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .form-container {
    background: white;
    padding: 2.5rem 2rem;
    border-radius: 1.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  }
}
</style>
