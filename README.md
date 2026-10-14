# ReelSnap — Modern Instagram Reels Downloader

**ReelSnap** adalah aplikasi web modern, cepat, dan aman yang memungkinkan pengguna mengunduh video Instagram Reels publik melalui tautan URL dengan tampilan antarmuka premium terinspirasi dari estetika Instagram.

---

## 📑 Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat Sistem](#-prasyarat-sistem)
- [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
- [Konfigurasi Environment (.env)](#-konfigurasi-environment-env)
- [Dokumentasi API](#-dokumentasi-api)
- [Arsitektur Keamanan & Kepatuhan](#-arsitektur-keamanan--kepatuhan)
- [Pengujian Otomatis (Testing)](#-pengujian-otomatis-testing)
- [Panduan Deployment](#-panduan-deployment)
- [Disclaimer](#-disclaimer)

---

## ✨ Fitur Utama

- 🎨 **Desain UI/UX Premium & Modern**: Skema warna gradasi Instagram yang memukau, tipografi modern *Plus Jakarta Sans*, kartu dengan bayangan lembut, dan ikon tajam dari *Lucide Icons*.
- 🌓 **Dukungan Dark Mode & Light Mode**: Dilengkapi sakelar tema otomatis dengan penyimpanan preferensi di `localStorage`.
- 📱 **100% Responsif di Semua Perangkat**: Tampilan adaptif untuk smartphone (Android & iOS), tablet, laptop, hingga monitor desktop beresolusi tinggi.
- ⚡ **Pengunduhan Video Nyata (.MP4)**: Menyajikan stream video langsung dari server CDN dengan header `Content-Disposition: attachment`, bukan tombol simulasi atau palsu.
- 📋 **Dukungan Clipboard Cepat**: Tombol *Paste* satu klik untuk menempelkan URL Reels langsung dari papan klip.
- 🛡️ **Keamanan Kelas Tinggi**:
  - Validasi ketat domain Instagram (`instagram.com`, `instagr.am`).
  - Perlindungan terhadap serangan **SSRF (Server-Side Request Forgery)** dengan pemblokiran alamat IP privat (127.0.0.1, 10.x, 192.168.x, link-local, dll.).
  - **Rate Limiting** via `express-rate-limit` untuk mencegah spam dan DoS.
  - Pembatasan ukuran request body dan sanitasi input.
  - Bebas dari penyimpanan data pribadi dan tidak membypass DRM atau akun privat.

---

## 🛠️ Teknologi yang Digunakan

### Frontend
- **HTML5**: Semantik modern, ramah SEO, aksesibilitas ARIA.
- **Vanilla CSS3**: Variabel CSS (design tokens), flexbox, CSS grid, micro-animations, glassmorphism. *(Tanpa React, Vue, atau framework JS luar)*.
- **Vanilla JavaScript (ES6+)**: Fetch API, penanganan DOM reaktif, Clipboard API, pemutar HTML5 Video native.
- **Lucide Icons**: Ikon modern berbasis SVG via CDN.

### Backend
- **Node.js**: Runtime JavaScript asynchronous (v18+ / v20+ / v24+).
- **Express.js**: Framework web minimalis dan cepat untuk REST API.
- **Axios**: HTTP client untuk scraping dan streaming chunk video langsung ke klien.
- **Cheerio**: Parser HTML server-side yang ringan dan aman.
- **Helmet**: Pengamanan HTTP headers dan Content-Security-Policy (CSP).
- **Express Rate Limit**: Pembatasan frekuensi request per IP.
- **ipaddr.js**: Validasi IP dan pemblokiran rentang IP internal untuk mitigasi SSRF.
- **dotenv**: Manajemen variabel lingkungan.

---

## 📁 Struktur Proyek

```
reelsnap/
├── public/                     # Frontend statis
│   ├── assets/
│   │   ├── favicon.svg         # Favicon brand ReelSnap
│   │   └── logo.svg            # Logo vektor ReelSnap
│   ├── index.html              # Struktur halaman utama & modal
│   ├── style.css               # Styling CSS lengkap & dark mode
│   └── script.js               # Logika klien & integrasi API
├── server/                     # Backend Express.js
│   ├── middleware/
│   │   ├── rateLimiter.js      # Middleware pembatas request
│   │   ├── ssrfProtection.js   # Mitigasi SSRF & validasi CDN
│   │   └── validator.js        # Validasi URL Instagram & ekstraksi shortcode
│   ├── routes/
│   │   ├── health.js           # Endpoint status server /api/health
│   │   └── reels.js            # Endpoint ekstraksi & download /api/reels
│   ├── services/
│   │   └── instagram.js        # Mesin ekstraksi GraphQL & streaming video
│   └── server.js               # Inisialisasi Express & konfigurasi server
├── tests/
│   └── test-api.js             # Pengujian otomatis endpoint & keamanan
├── .env.example                # Template variabel lingkungan
├── .env                        # Konfigurasi aktif (jangan commit ke publik)
├── .gitignore                  # Berkas yang diabaikan Git
├── package.json                # Dependensi & skrip Node.js
└── README.md                   # Dokumentasi lengkap proyek
```

---

## 📋 Prasyarat Sistem

- **Node.js**: Versi `18.0.0` atau yang lebih baru (disarankan LTS 20.x atau 24.x).
- **NPM**: Versi `9.0.0` atau yang lebih baru.

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

1. **Buka Terminal / PowerShell di direktori proyek**:
   ```bash
   cd "c:\xampp\htdocs\ig downloader"
   ```

2. **Pasang Dependensi**:
   ```bash
   npm install
   ```

3. **Siapkan Konfigurasi Environment**:
   Salin berkas `.env.example` menjadi `.env`:
   ```bash
   # Di Windows PowerShell:
   Copy-Item .env.example .env
   ```

4. **Jalankan Server**:
   - Mode Produksi:
     ```bash
     npm start
     ```
   - Mode Pengembangan (Hot-reload dengan watch):
     ```bash
     npm run dev
     ```

5. **Buka Aplikasi di Browser**:
   Akses `http://localhost:3000` melalui browser pilihan Anda.

---

## ⚙️ Konfigurasi Environment (.env)

| Variabel | Default | Deskripsi |
|---|---|---|
| `PORT` | `3000` | Port tempat Express server berjalan |
| `NODE_ENV` | `development` | Mode aplikasi (`development` atau `production`) |
| `CORS_ORIGIN` | `*` | Domain asal yang diizinkan untuk CORS (gunakan domain frontend jika dipisah) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Jendela waktu rate limiting dalam milidetik (1 menit) |
| `RATE_LIMIT_MAX` | `30` | Batas maksimum request info per IP per jendela waktu |
| `DOWNLOAD_RATE_LIMIT_MAX` | `20` | Batas maksimum request download per IP per jendela waktu |
| `INSTAGRAM_COOKIE` | *(Opsional)* | Cookie sesi Instagram (untuk meningkatkan kuota scraping) |
| `RAPIDAPI_KEY` | *(Opsional)* | API key RapidAPI sebagai failover tambahan |

---

## 📡 Dokumentasi API

### 1. Health Check
Memeriksa status operasional server backend.

- **URL:** `/api/health`
- **Method:** `GET`
- **Response Success (200):**
  ```json
  {
    "success": true,
    "status": "healthy",
    "service": "ReelSnap API",
    "uptime": 124,
    "timestamp": "2026-10-14T11:20:00.000Z",
    "version": "1.0.0",
    "nodeVersion": "v24.18.0"
  }
  ```

---

### 2. Dapatkan Informasi & Metadata Reels
Mengekstrak informasi video dari URL Instagram Reels publik.

- **URL:** `/api/reels/info`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "url": "https://www.instagram.com/reel/C3bVqj_P2mF/"
  }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "message": "Video Reels berhasil ditemukan.",
    "data": {
      "id": "C3bVqj_P2mF",
      "shortcode": "C3bVqj_P2mF",
      "title": "Deskripsi singkat video Reels...",
      "caption": "Deskripsi lengkap video Reels...",
      "author": {
        "username": "kreator_ig",
        "name": "Nama Kreator"
      },
      "thumbnail": "https://scontent.cdninstagram.com/...",
      "videoUrl": "https://scontent.cdninstagram.com/....mp4",
      "downloadUrl": "/api/reels/download?url=...&code=C3bVqj_P2mF",
      "duration": 28,
      "stats": {
        "likes": 12500,
        "plays": 85000
      },
      "isReel": true
    }
  }
  ```
- **Response Error (400 / 404 / 429):**
  ```json
  {
    "success": false,
    "error": "Tautan tidak valid atau video tidak dapat diakses.",
    "code": "INVALID_INSTAGRAM_URL"
  }
  ```

---

### 3. Stream & Download Video
Mengalirkan stream video dari server CDN langsung ke browser dengan header `Content-Disposition: attachment`.

- **URL:** `/api/reels/download?url={CDN_URL}&code={SHORTCODE}`
- **Method:** `GET`
- **Headers Dikirim:**
  - `Content-Disposition: attachment; filename="reelsnap-C3bVqj_P2mF.mp4"`
  - `Content-Type: video/mp4`

---

## 🔒 Arsitektur Keamanan & Kepatuhan

1. **Perlindungan Anti-SSRF (Server-Side Request Forgery)**:
   - Setiap URL video yang masuk ke `/api/reels/download` divalidasi hostname-nya terhadap whitelist domain resmi Meta/Instagram (`*.cdninstagram.com`, `*.fbcdn.net`).
   - Melakukan DNS lookup menggunakan library `ipaddr.js` untuk memastikan hostname tidak me-resolve ke alamat IP lokal atau privat (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254, loopback IPv6 `::1`).
2. **Tidak Menyimpan Konten Pengguna**:
   - Video di-stream langsung secara *pass-through* ke klien tanpa disimpan di hard drive server.
   - Menghemat kapasitas penyimpanan dan melindungi hak privasi.
3. **Penyembunyian Jejak Server (No Stack Trace Leaks)**:
   - Handler error tersentralisasi menangkap kegagalan internal dan hanya mengembalikan pesan yang aman dan ramah pengguna ke frontend.
4. **Pembatasan Beban (Rate Limiting & Payload Limits)**:
   - Ukuran payload JSON dibatasi maksimum 15 KB.
   - Rate limiting per alamat IP untuk mencegah bot/brute-force.

---

## 🧪 Pengujian Otomatis (Testing)

ReelSnap dilengkapi rangkaian pengujian otomatis untuk memvalidasi keamanan, filter SSRF, parser regex, dan endpoint API:

```bash
npm test
```

Hasil pengujian mencakup:
- Ekstraksi shortcode dari URL Reels & Post
- Penolakan host mencurigakan dan URL non-Instagram
- Deteksi IP privat vs IP publik oleh filter SSRF
- Pengujian HTTP endpoint `/api/health`, `/api/reels/info`, `/api/reels/download`
- Pengujian penyajian berkas statis frontend

---

## 🌐 Panduan Deployment

### Opsi A: Deployment di Render / Railway (Paling Direkomendasikan)
1. Hubungkan repositori Git Anda ke akun **Render** atau **Railway**.
2. Pilih tipe layanan: **Web Service**.
3. Atur konfigurasi build & start:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Tambahkan Environment Variable di dashboard:
   - `NODE_ENV=production`
   - `PORT=3000` (atau biarkan otomatis sesuai platform)
5. Simpan dan klik **Deploy**.

### Opsi B: Deployment di VPS (Ubuntu / Debian dengan Nginx & PM2)
1. Clone repositori ke VPS:
   ```bash
   git clone <URL_REPO> /var/www/reelsnap
   cd /var/www/reelsnap
   npm install --production
   ```
2. Jalankan aplikasi menggunakan PM2:
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name "reelsnap"
   pm2 startup
   pm2 save
   ```
3. Konfigurasikan reverse proxy Nginx mengarah ke `http://127.0.0.1:3000` dan aktifkan SSL melalui Certbot / Let's Encrypt.

---

## ⚠️ Disclaimer

ReelSnap adalah proyek independen yang dibuat untuk tujuan edukasi dan penggunaan pribadi. ReelSnap **tidak berafiliasi, disponsori, atau secara resmi didukung oleh Instagram atau Meta Platforms, Inc.** Seluruh merek dagang dan hak cipta Instagram merupakan milik masing-masing pemiliknya. Gunakan hanya untuk konten yang Anda miliki atau yang telah mendapatkan izin pengunduhan dari pemilik aslinya.
