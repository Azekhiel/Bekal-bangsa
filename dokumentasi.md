# 🍱 Bekal Bangsa: Platform Cerdas Ekosistem Pangan Lokal

**"Dari Lahan Lokal, Jadi Bekal Masa Depan"**

**Bekal Bangsa** adalah platform digital terintegrasi yang menghubungkan **UMKM/Pedagang Pasar (Vendor)** dengan **Dapur Satuan Pelayanan Gizi (Kitchen Hub/SPPG)**. Platform ini dirancang untuk mendukung program ketahanan pangan nasional, khususnya program Makan Bergizi Gratis (MBG), dengan memanfaatkan teknologi **Artificial Intelligence (AI)** dan **Internet of Things (IoT)**. Tujuan utamanya adalah meningkatkan efisiensi rantai pasok, memastikan kualitas bahan pangan, dan meminimalkan pemborosan makanan (*food waste*) melalui manajemen stok yang cerdas.

-----

## 🏗️ Arsitektur Teknologi (Tech Stack)

Proyek ini dibangun menggunakan arsitektur *Full Stack* modern yang memisahkan logika bisnis (backend), antarmuka pengguna (frontend), dan kecerdasan buatan.

### **Frontend**

  * **Framework:** Next.js 14 (App Router)
  * **Bahasa Pemrograman:** TypeScript
  * **Styling:** Tailwind CSS
  * **UI Components:** Shadcn UI, Lucide React (Ikon)
  * **Visualisasi Data:** Recharts (Grafik & Analitik Interaktif)
  * **Autentikasi:** Integrasi JWT & Google OAuth (`@react-oauth/google`)
  * **Manajemen State:** React Hooks (`useState`, `useEffect`, `useContext`)

### **Backend**

  * **Framework:** FastAPI (Python) - High performance, easy to use.
  * **Server:** Uvicorn (ASGI Server)
  * **AI Engine:** Claude Sonnet 4.5 (via Kolosal API)
      * *Computer Vision:* Analisis stok mentah dari foto & Quality Control (QC) makanan jadi.
      * *NLP/Chat:* Chatbot asisten dapur cerdas & rekomendasi resep berbasis stok.
  * **Keamanan:**
      * `Passlib` dengan `Bcrypt` untuk hashing password.
      * `Python-Jose` untuk manajemen JWT Token.
      * `Slowapi` untuk Rate Limiting (mencegah penyalahgunaan API).

### **Database & Cloud**

  * **Database:** Supabase (PostgreSQL) - Relational Database dengan fitur realtime.
  * **Storage:** Supabase Storage - Penyimpanan aman untuk foto stok & bukti QC.

-----

## 🌟 Fitur Utama & Fungsionalitas

### **1. Sistem Otentikasi & Keamanan (RBAC)**

Sistem memiliki manajemen hak akses berbasis peran (*Role-Based Access Control*) yang ketat:

  * **Multi-Role:** Akses terpisah untuk **Vendor (Pedagang)** dan **Kitchen Admin (Dapur SPPG)**.
  * **Metode Login:**
      * **Manual:** Login menggunakan Username/Email & Password yang terenkripsi.
      * **Google OAuth:** Login instan menggunakan akun Google (dengan fitur Auto-Register untuk pengguna baru).
  * **Keamanan Data:** Setiap request API dilindungi oleh JWT Token. Data antar pengguna terisolasi (Vendor A tidak bisa melihat stok Vendor B).

### **2. Modul UMKM Vendor (Pedagang Pasar)**

Memberdayakan pedagang lokal untuk mendigitalkan stok mereka dengan mudah.

  * **AI Inventory Upload:** Vendor cukup memfoto bahan dagangan. AI (Computer Vision) akan otomatis mendeteksi nama barang, jumlah, satuan, dan tingkat kesegarannya.
  * **Dashboard Analitik Pribadi:** Grafik visual yang menampilkan status kesehatan stok (Stok Segar, Warning, Kadaluwarsa) dan tren penjualan.
  * **Manajemen Pesanan Masuk:** Notifikasi realtime saat ada pesanan dari Kitchen. Vendor dapat mengubah status pesanan (Konfirmasi -\> Kirim -\> Selesai).
  * **Smart Location:** Deteksi lokasi GPS otomatis untuk memetakan jarak pengiriman ke Kitchen terdekat.

### **3. Modul Kitchen Admin (Dapur SPPG)**

Pusat komando untuk manajemen produksi makanan bergizi.

  * **Pencarian Supplier Cerdas:** Mencari bahan baku spesifik dari Vendor terdekat berdasarkan lokasi GPS real-time untuk efisiensi logistik.
  * **Smart Cooking & Production:**
      * Pencatatan siklus produksi masakan.
      * Otomatisasi pengurangan stok gudang saat menu dimasak.
      * Estimasi masa simpan (*shelf-life*) makanan jadi berdasarkan analisis AI.
  * **AI Chef Assistant (Chatbot):**
      * Asisten virtual yang mengetahui isi stok gudang secara real-time.
      * Memberikan rekomendasi "Rescue Menu" berdasarkan bahan yang hampir kadaluwarsa untuk mengurangi limbah.
      * Fitur **Voice Command** (Speech-to-Text & Text-to-Speech) untuk interaksi hands-free di dapur.
  * **Quality Control (QC) Visual:** Scan foto makanan jadi sebelum distribusi. AI menilai kelayakan konsumsi, mendeteksi tanda kerusakan visual, dan mengestimasi nilai gizi.
  * **IoT Monitoring:** Integrasi simulasi sensor suhu & kelembaban gudang penyimpanan untuk menjaga kualitas bahan baku tetap optimal.

-----

## 🗄️ Skema Database (PostgreSQL)

Struktur tabel dirancang untuk integritas data dan relasi yang kuat antar entitas.

```sql
-- 1. USERS (Menyimpan data Vendor & Kitchen secara terpusat)
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name text NOT NULL,
  username text UNIQUE,
  email text UNIQUE,
  password text, -- Disimpan sebagai Bcrypt Hash
  role text CHECK (role IN ('vendor', 'kitchen')), -- Validasi peran
  phone_number text,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. SUPPLIES (Stok dagangan milik Vendor)
CREATE TABLE public.supplies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint REFERENCES public.users(id), -- Relasi ke Pemilik Barang
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit text,
  quality_status text, -- Contoh: 'Sangat Segar', 'Cukup'
  expiry_days integer,
  expiry_date date,
  photo_url text,
  ai_notes text,
  owner_name text, -- Cache nama pemilik untuk performa read
  location text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. ORDERS (Transaksi pembelian Kitchen ke Vendor)
CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supply_id bigint REFERENCES public.supplies(id),
  buyer_id bigint REFERENCES public.users(id), -- ID Kitchen
  seller_id bigint REFERENCES public.users(id), -- ID Vendor
  qty_ordered integer NOT NULL,
  status text DEFAULT 'pending', -- Status: pending, confirmed, completed
  buyer_name text,
  total_price bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. MEAL_PRODUCTIONS (Log Produksi Masakan Kitchen)
CREATE TABLE public.meal_productions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  menu_name text NOT NULL,
  qty_produced integer NOT NULL,
  expiry_datetime timestamp without time zone,
  status text DEFAULT 'fresh', -- Status: fresh, served
  storage_tips text,
  nutrition_info text, -- JSON string estimasi nutrisi
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. STORAGE_LOGS (Log Data Sensor IoT)
CREATE TABLE public.storage_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  temperature double precision,
  humidity double precision,
  device_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

-----

## 🚀 Panduan Instalasi & Menjalankan (Local Development)

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer lokal Anda.

### Prasyarat

  * Python 3.10 atau lebih baru.
  * Node.js 18 (LTS) atau lebih baru.
  * Akun **Supabase** (untuk Database & Storage).
  * Akun **Google Cloud Platform** (untuk Client ID OAuth).
  * API Key **Kolosal/Claude** (untuk fitur AI).

### 1\. Setup Backend (FastAPI)

```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment (Disarankan)
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies yang dibutuhkan
pip install fastapi uvicorn python-multipart python-jose[cryptography] passlib[bcrypt] supabase openai python-dotenv slowapi google-auth requests

# Jalankan Server Backend
uvicorn main:app --reload
```

*Backend akan berjalan di: `http://localhost:8000`*
*Dokumentasi API (Swagger UI): `http://localhost:8000/docs`*

### 2\. Setup Frontend (Next.js)

```bash
# Masuk ke folder frontend
cd frontend_next

# Install dependencies Node.js
npm install

# Jalankan Server Frontend (Development Mode)
npm run dev
```

*Frontend akan berjalan di: `http://localhost:3000`*

### 3\. Konfigurasi Environment Variables

Buat file konfigurasi `.env` (di folder `backend`) dan `.env.local` (di folder `frontend_next`) dengan isi sebagai berikut:

**File `backend/.env`:**

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-public-key"
KOLOSAL_API_KEY="your-kolosal-api-key"
KOLOSAL_BASE_URL="https://api.kolosal.ai/v1" # Sesuaikan jika berbeda
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
SECRET_KEY="your-very-secret-random-string-for-jwt"
```

**File `frontend_next/.env.local`:**

```env
NEXT_PUBLIC_API_BASE="http://localhost:8000/api"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com" # Harus sama dengan backend
```

-----

## 📅 Log Pencapaian (Progress Update)

### ✅ Backend Logic & Security

  * **Secure Authentication:** Implementasi penuh login JWT. Endpoint kritis (`/supplies`, `/orders`) kini terlindungi dan memerlukan token valid.
  * **Data Isolation:** Implementasi filter query tingkat database. Vendor hanya dapat melihat dan mengelola data milik mereka sendiri.
  * **Smart Analytics:** API analitik kini mengembalikan data spesifik per user, bukan data global.
  * **Reliable AI Integration:** Endpoint `/api/kitchen/chat` kini memiliki *context-awareness* terhadap stok gudang user untuk memberikan saran yang relevan.

### ✅ Frontend & User Experience

  * **Real Auth Flow:** Navigasi login yang berfungsi penuh dengan redirect cerdas berdasarkan peran user.
  * **Robust API Handling:** Modul `api.ts` yang otomatis menangani penyisipan Token Authorization dan error handling global.
  * **Interactive Chatbot:** Antarmuka percakapan modern dengan fitur suara dua arah (mendengar & berbicara).
  * **Dynamic Dashboard:** Header, Avatar, dan Widget Lokasi kini menampilkan data profil pengguna yang sebenarnya.

### ✅ Database Integrity

  * **Schema Update:** Penambahan kolom vital (`username`, `password`, `latitude`, `longitude`) pada tabel `users`.
  * **Data Seeding:** Script inisialisasi data user default (`pak_asep`, `bu_susi`, `admin_pusat`) untuk keperluan demo.
  * **Relationship Fixes:** Perbaikan data lama pada tabel `orders` dan `supplies` agar memiliki relasi Foreign Key yang valid ke tabel `users`.

-----

## 🔮 Rencana Pengembangan (Roadmap)

1.  **Integrasi Pembayaran:** Menambahkan gateway pembayaran (QRIS) untuk transaksi non-tunai antar Kitchen dan Vendor.
2.  **Mobile PWA:** Mengoptimalkan frontend menjadi Progressive Web App (PWA) untuk pengalaman native di perangkat seluler.
3.  **Advanced IoT:** Menghubungkan sistem dengan perangkat keras sensor nyata (ESP32/DHT11) untuk monitoring gudang fisik.
4.  **Reporting:** Fitur ekspor laporan transaksi dan stok bulanan dalam format PDF/Excel.