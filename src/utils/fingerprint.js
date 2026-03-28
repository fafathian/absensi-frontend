import fpPromise from "@fingerprintjs/fingerprintjs";

// Fungsi untuk mendapatkan Visitor ID unik (Fingerprint)
export const getDeviceId = async () => {
  try {
    // Ambil token localStorage jika sudah ada (opsional, untuk cache)
    const cachedId = localStorage.getItem("cached_device_id");
    if (cachedId) return cachedId;

    // Load agent FingerprintJS
    const fp = await fpPromise.load();

    // Ambil hasilnya
    const result = await fp.get();

    // visitorId adalah string unik panjang (misal: "ef6275b...")
    const deviceId = result.visitorId;

    // Simpan di cache agar tidak load terus
    localStorage.setItem("cached_device_id", deviceId);

    return deviceId;
  } catch (error) {
    console.error("Gagal mengambil Fingerprint device:", error);
    // Fallback sederhana jika library gagal (jangan pakai ini di produksi)
    return "unknown_device_" + Date.now();
  }
};
