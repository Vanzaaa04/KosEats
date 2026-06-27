# ðŸš KosEats â€” Implementation Plan Final

> **Marketplace Masakan Rumahan Hiperlokal**
> "Gak Pake Ribet, Makanan Enak Langsung Mendarat di Kamar"

---

## Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| **Frontend** | Next.js (React) | SSR, routing bawaan, performa cepat |
| **Styling** | Vanilla CSS | Sesuai guideline, kontrol penuh |
| **Backend** | Node.js + Express | Ringan, cocok untuk REST API |
| **Database** | PostgreSQL | Relasional, cocok untuk transaksi keuangan |
| **ORM** | Prisma | Type-safe, migrasi mudah |
| **Auth** | JWT + bcrypt | Standar industri |
| **Payment** | Midtrans | Payment gateway Indonesia, support QRIS/e-wallet/transfer |
| **Maps** | Google Maps JavaScript API | Tracking real-time, $200 gratis/bulan (~28.500 loads) |
| **Real-time** | WebSocket (Socket.io) | Untuk GPS tracking + push notification |
| **Push Notif** | Firebase Cloud Messaging (FCM) | Push notification ke browser/HP |
| **File Upload** | Cloudinary / local storage | Upload foto menu & bukti banding |
| **Hosting** | Vercel (frontend) + Railway/Render (backend) | Free tier tersedia |

---

## Branding & Desain

| Elemen | Nilai |
|---|---|
| **Warna Primer** | Oranye Hangat `#D35400` |
| **Warna Sekunder** | Putih `#FFFFFF` |
| **Warna Teks** | Abu Gelap `#2C3E50` |
| **Warna Aksen** | Hijau `#27AE60` (sukses), Merah `#E74C3C` (error) |
| **Font** | Nunito / Poppins (rounded, friendly) |
| **Tone** | Santai, akrab, seperti kakak kos |

---

## 3 Role Pengguna

| Role | Deskripsi |
|---|---|
| **Pembeli** | Mahasiswa / anak kos yang pesan makanan |
| **Penjual** | Mitra UMKM / Ibu RT yang jual makanan |
| **Admin** | Pengelola platform KosEats |

---

## Arsitektur Halaman & Fitur Lengkap

### ðŸ›’ PEMBELI

| Halaman | Fitur Detail |
|---|---|
| **Beranda** | Daftar menu dari penjual terdekat (radius < 1km), search bar, filter kategori, badge "Info Gizi âœ“" di menu yang ada info gizi, label diskon jika ada |
| **Kategori** | 6 kategori: Nasi+Lauk, Lauk Saja, Sayur & Sup, Cemilan/Gorengan, Minuman, Paket Hemat |
| **Detail Menu** | Foto, harga, ~~harga coret~~ jika ada diskon, sisa kuota diskon, deskripsi, info gizi (kalori/protein/karbo/lemak/bahan â€” jika diisi penjual), rating, ulasan, tombol "Tambah ke Keranjang" |
| **Profil Toko** | Nama toko, foto, rating rata-rata, jam buka-tutup, jarak, semua menu penjual, ulasan terbaru |
| **Keranjang** | List pesanan, pilih metode kirim (Antar Penjual / Ambil Sendiri / Kurir Mitra), estimasi ongkir, total harga setelah diskon |
| **Checkout** | Ringkasan pesanan â†’ Pembayaran via Midtrans (QRIS, e-wallet, transfer) |
| **Pesanan Aktif** | Status real-time: Dikonfirmasi â†’ Dimasak â†’ Diantar â†’ Diterima. **Peta GPS** muncul saat status "Diantar" â€” lihat posisi pengantar |
| **Riwayat Pesanan** | Semua pesanan sebelumnya, tombol "Pesan Ulang", tombol "Beri Ulasan" |
| **Beri Ulasan** | Rating 1-5 bintang + komentar (hanya setelah pesanan selesai) |
| **Ajukan Banding** | Pilih alasan, upload foto bukti, tulis penjelasan â†’ kirim ke penjual |
| **Status Banding** | Lihat progress: Menunggu Penjual â†’ Diterima/Ditolak â†’ Hubungi Admin â†’ Keputusan Final |
| **Penjual Favorit** | List penjual yang di-bookmark |
| **Notifikasi** | ðŸ”” Lonceng di navbar + Push notification untuk: pesanan dikonfirmasi, diantar, selesai, banding direspon |
| **Profil** | Edit nama, alamat kos, nomor WA, foto profil |

---

### ðŸ³ PENJUAL

| Halaman | Fitur Detail |
|---|---|
| **Dashboard** | Ringkasan hari ini: total pesanan, pendapatan bersih (88%), pesanan aktif, rating toko |
| **Kelola Menu** | CRUD menu: nama, foto, harga, deskripsi, stok harian, kategori, **info gizi opsional** (kalori, protein, karbo, lemak, bahan utama) |
| **Kelola Diskon** | Buat diskon untuk menu sendiri: pilih menu â†’ potongan harga â†’ atur kuota (berapa orang) â†’ aktifkan. Penjual yang tanggung biaya diskon |
| **Pesanan Masuk** | Terima / Tolak pesanan baru. Update status: Dikonfirmasi â†’ Dimasak â†’ Diantar/Siap Diambil â†’ Selesai |
| **GPS Share** | Saat status "Diantar", penjual/kurir aktifkan share lokasi dari HP untuk tracking pembeli |
| **Banding Masuk** | Lihat banding dari pembeli â†’ Terima (refund otomatis) / Tolak (pembeli bisa hubungi admin) |
| **Riwayat Transaksi** | Semua transaksi + pendapatan bersih (harga - komisi 12%) + status refund jika ada |
| **Ulasan** | Lihat semua rating & komentar dari pembeli |
| **Pengaturan Toko** | Nama toko, alamat, jam buka-tutup, foto, toggle Buka/Tutup, radius antar |
| **Notifikasi** | ðŸ”” Lonceng + Push: pesanan baru masuk, banding masuk, reminder stok |

---

### ðŸ›¡ï¸ ADMIN

| Halaman | Fitur Detail |
|---|---|
| **Dashboard Overview** | **ðŸ’° ICON BESAR: Total Pendapatan Platform** (komisi 12% dari semua transaksi). Card: Total Transaksi, Total Pembeli, Total Penjual, Rating Rata-rata Platform |
| **6 Grafik Analitik** | (1) ðŸ“ˆ Tren Pendapatan per hari/minggu/bulan, (2) ðŸ“Š Volume Transaksi per hari/minggu, (3) ðŸ† Top 5 Menu Terlaris, (4) â° Jam Peak Order, (5) ðŸ‘¥ Pertumbuhan User, (6) â­ Distribusi Rating |
| **Daftar Transaksi** | Semua transaksi: pembeli, penjual, menu, harga, komisi platform, status, tanggal |
| **Kelola Penjual** | Approve/reject pendaftaran mitra baru, nonaktifkan penjual bermasalah, lihat detail toko |
| **Kelola Pembeli** | Daftar semua pembeli, nonaktifkan akun jika perlu |
| **Kelola Menu** | Moderasi menu: hapus menu tidak layak/melanggar |
| **Kelola Ulasan** | Moderasi: hapus ulasan spam/tidak pantas |
| **Kelola Diskon Platform** | Buat diskon dari platform: jenis (ongkir/makanan) â†’ potongan â†’ kuota â†’ aktifkan. Admin bayar selisih (ke kurir jika diskon ongkir, ke penjual jika diskon makanan) |
| **Kelola Banding** | Lihat banding yang di-eskalasi ke admin (penjual tolak tapi pembeli hubungi admin). Admin review â†’ Setujui (penjual WAJIB refund) / Tolak (final) |
| **Rekap Keuangan** | Detail pemasukan: komisi per transaksi, total komisi harian/mingguan/bulanan, pengeluaran diskon platform, saldo bersih |
| **Notifikasi** | ðŸ”” Lonceng + Push: penjual baru mendaftar, banding masuk, transaksi anomali |

---

## ðŸ’° Alur Transaksi & Uang

### Alur Pesanan Normal

```mermaid
sequenceDiagram
    participant P as Pembeli
    participant S as Sistem
    participant PJ as Penjual
    participant M as Midtrans

    P->>S: Pesan menu + pilih metode kirim
    S->>M: Buat payment link
    M->>P: Tampilkan halaman bayar (QRIS/e-wallet/transfer)
    P->>M: Bayar
    M->>S: Callback: pembayaran sukses
    S->>PJ: Notif: "Pesanan baru masuk!"
    PJ->>S: Konfirmasi (Terima)
    S->>P: Notif: "Pesanan dikonfirmasi"
    PJ->>S: Update: "Sedang dimasak"
    PJ->>S: Update: "Diantar" + aktifkan GPS
    S->>P: Notif: "Pesanan diantar!" + tampilkan peta GPS
    P->>S: Konfirmasi: "Pesanan diterima"
    S->>P: Notif: "Selesai! Beri ulasan?"
```

### Alur Uang

```mermaid
graph TD
    A["Pembeli bayar Rp 15.000<br/>via Midtrans"] --> B["Dana masuk ke<br/>rekening platform"]
    B --> C["Komisi 12% = Rp 1.800<br/>â†’ Kas Platform<br/>(tampil di dashboard admin)"]
    B --> D["88% = Rp 13.200<br/>â†’ Saldo Penjual<br/>(tampil di dashboard penjual)"]
```

### Alur Diskon

```mermaid
graph TD
    subgraph "Diskon dari Penjual"
        A1["Penjual buat diskon<br/>Menu Rp 18.000 â†’ Rp 15.000"] --> B1["Selisih Rp 3.000<br/>ditanggung PENJUAL"]
        B1 --> C1["Pembeli bayar Rp 15.000"]
        C1 --> D1["Komisi 12% dari Rp 15.000 = Rp 1.800"]
    end

    subgraph "Diskon Ongkir dari Admin"
        A2["Admin buat diskon ongkir<br/>Ongkir Rp 2.000 â†’ Rp 0"] --> B2["Selisih Rp 2.000<br/>dibayar ADMIN ke kurir"]
    end

    subgraph "Diskon Makanan dari Admin"
        A3["Admin buat diskon makanan<br/>Menu Rp 15.000 â†’ Rp 12.000"] --> B3["Selisih Rp 3.000<br/>dibayar ADMIN ke penjual"]
        B3 --> C3["Penjual tetap terima full<br/>88% Ã— Rp 15.000"]
    end
```

### Alur Banding & Refund

```mermaid
graph TD
    A["Pembeli ajukan banding<br/>+ alasan + foto bukti"] --> B["Penjual review"]
    B -->|Terima| C["âœ… Refund otomatis ke pembeli"]
    B -->|Tolak| D["Pembeli bisa 'Hubungi Admin'"]
    D --> E["Admin review kasus"]
    E -->|Setujui| F["âœ… Penjual WAJIB refund"]
    E -->|Tolak| G["âŒ Final, tidak ada refund"]
```

---

## ðŸ—„ï¸ Desain Database (Tabel Utama)

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string email
        string password_hash
        enum role "BUYER | SELLER | ADMIN"
        string phone
        string address
        float latitude
        float longitude
        string photo_url
        boolean is_active
        datetime created_at
    }

    STORE {
        int id PK
        int user_id FK
        string name
        string address
        string photo_url
        float latitude
        float longitude
        string open_time
        string close_time
        float delivery_radius_km
        boolean is_open
        enum status "PENDING | APPROVED | REJECTED"
    }

    MENU {
        int id PK
        int store_id FK
        string name
        string description
        string photo_url
        int price
        int daily_stock
        enum category "NASI_LAUK | LAUK | SAYUR | CEMILAN | MINUMAN | PAKET"
        boolean is_available
    }

    NUTRITION {
        int id PK
        int menu_id FK
        int calories
        float protein_g
        float carbs_g
        float fat_g
        string ingredients
    }

    DISCOUNT {
        int id PK
        int created_by FK "user_id admin atau seller"
        enum source "ADMIN | SELLER"
        enum type "FOOD | DELIVERY"
        int menu_id FK "nullable, untuk diskon makanan"
        int amount
        int quota_total
        int quota_used
        boolean is_active
    }

    ORDER {
        int id PK
        int buyer_id FK
        int store_id FK
        int discount_id FK "nullable"
        enum delivery_method "SELLER_DELIVERY | PICKUP | COURIER"
        enum status "PENDING | CONFIRMED | COOKING | DELIVERING | DELIVERED | CANCELLED"
        int subtotal
        int delivery_fee
        int discount_amount
        int total
        int platform_fee "komisi 12%"
        int seller_income "88%"
        string midtrans_order_id
        enum payment_status "PENDING | PAID | REFUNDED"
        datetime created_at
    }

    ORDER_ITEM {
        int id PK
        int order_id FK
        int menu_id FK
        int quantity
        int price
    }

    REVIEW {
        int id PK
        int order_id FK
        int buyer_id FK
        int store_id FK
        int rating "1-5"
        string comment
        datetime created_at
    }

    APPEAL {
        int id PK
        int order_id FK
        int buyer_id FK
        string reason
        string photo_url
        string description
        enum status "WAITING_SELLER | ACCEPTED | REJECTED_SELLER | WAITING_ADMIN | ADMIN_APPROVED | ADMIN_REJECTED"
        string admin_note
        datetime created_at
    }

    NOTIFICATION {
        int id PK
        int user_id FK
        string title
        string message
        enum type "ORDER | APPEAL | SYSTEM | PROMO"
        boolean is_read
        datetime created_at
    }

    LOCATION_TRACKING {
        int id PK
        int order_id FK
        float latitude
        float longitude
        datetime timestamp
    }

    FAVORITE {
        int id PK
        int buyer_id FK
        int store_id FK
    }

    USER ||--o| STORE : "penjual punya"
    STORE ||--o{ MENU : "punya banyak"
    MENU ||--o| NUTRITION : "info gizi opsional"
    MENU ||--o{ DISCOUNT : "bisa dapat diskon"
    USER ||--o{ ORDER : "pembeli pesan"
    STORE ||--o{ ORDER : "dari toko"
    ORDER ||--o{ ORDER_ITEM : "berisi item"
    ORDER ||--o| REVIEW : "bisa diulas"
    ORDER ||--o| APPEAL : "bisa banding"
    ORDER ||--o{ LOCATION_TRACKING : "tracking GPS"
    USER ||--o{ NOTIFICATION : "terima notif"
    USER ||--o{ FAVORITE : "bookmark toko"
```

**Total: 12 tabel utama**

---

## ðŸ“ Struktur Project

```
KosEats/
â”œâ”€â”€ client/                    # Frontend (Next.js)
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ (auth)/            # Login, Register
â”‚   â”‚   â”œâ”€â”€ (buyer)/           # Halaman pembeli
â”‚   â”‚   â”‚   â”œâ”€â”€ home/          # Beranda + katalog
â”‚   â”‚   â”‚   â”œâ”€â”€ menu/[id]/     # Detail menu
â”‚   â”‚   â”‚   â”œâ”€â”€ store/[id]/    # Profil toko
â”‚   â”‚   â”‚   â”œâ”€â”€ cart/          # Keranjang
â”‚   â”‚   â”‚   â”œâ”€â”€ checkout/      # Checkout + Midtrans
â”‚   â”‚   â”‚   â”œâ”€â”€ orders/        # Pesanan aktif + riwayat
â”‚   â”‚   â”‚   â”œâ”€â”€ tracking/[id]/ # GPS tracking
â”‚   â”‚   â”‚   â”œâ”€â”€ appeal/[id]/   # Ajukan banding
â”‚   â”‚   â”‚   â”œâ”€â”€ favorites/     # Penjual favorit
â”‚   â”‚   â”‚   â””â”€â”€ profile/       # Profil pembeli
â”‚   â”‚   â”œâ”€â”€ (seller)/          # Halaman penjual
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/     # Dashboard penjual
â”‚   â”‚   â”‚   â”œâ”€â”€ menu/          # Kelola menu + info gizi
â”‚   â”‚   â”‚   â”œâ”€â”€ discounts/     # Kelola diskon
â”‚   â”‚   â”‚   â”œâ”€â”€ orders/        # Pesanan masuk + status
â”‚   â”‚   â”‚   â”œâ”€â”€ appeals/       # Banding masuk
â”‚   â”‚   â”‚   â”œâ”€â”€ reviews/       # Ulasan
â”‚   â”‚   â”‚   â””â”€â”€ settings/      # Pengaturan toko
â”‚   â”‚   â””â”€â”€ (admin)/           # Halaman admin
â”‚   â”‚       â”œâ”€â”€ dashboard/     # Overview + 6 grafik
â”‚   â”‚       â”œâ”€â”€ transactions/  # Daftar transaksi
â”‚   â”‚       â”œâ”€â”€ sellers/       # Kelola penjual
â”‚   â”‚       â”œâ”€â”€ buyers/        # Kelola pembeli
â”‚   â”‚       â”œâ”€â”€ menus/         # Moderasi menu
â”‚   â”‚       â”œâ”€â”€ reviews/       # Moderasi ulasan
â”‚   â”‚       â”œâ”€â”€ discounts/     # Diskon platform
â”‚   â”‚       â”œâ”€â”€ appeals/       # Kelola banding
â”‚   â”‚       â””â”€â”€ finance/       # Rekap keuangan
â”‚   â”œâ”€â”€ components/            # Komponen reusable
â”‚   â””â”€â”€ styles/                # Vanilla CSS
â”œâ”€â”€ server/                    # Backend (Express)
â”‚   â”œâ”€â”€ routes/                # API routes
â”‚   â”œâ”€â”€ controllers/           # Business logic
â”‚   â”œâ”€â”€ middleware/             # Auth, validation
â”‚   â”œâ”€â”€ services/              # Midtrans, FCM, Socket
â”‚   â””â”€â”€ prisma/                # Schema + migrations
â””â”€â”€ README.md
```

---

## ðŸš€ Tahap Development (5 Sprint)

### Sprint 1: Fondasi (Auth + Database + Layout)
- Setup project Next.js + Express + PostgreSQL + Prisma
- Desain database & migrasi
- Sistem auth (register/login) untuk 3 role
- Layout utama: navbar, sidebar, footer
- Halaman landing page

### Sprint 2: Fitur Inti Penjual
- CRUD menu + upload foto + info gizi opsional
- Pengaturan toko (jam buka, toggle buka/tutup)
- Dashboard penjual (ringkasan)
- Kelola diskon penjual

### Sprint 3: Fitur Inti Pembeli
- Beranda + katalog + filter kategori + search
- Detail menu + profil toko
- Keranjang + pilih metode kirim
- Checkout + integrasi Midtrans
- Pesanan aktif + status tracking
- Beri ulasan

### Sprint 4: Fitur Lanjutan
- GPS tracking real-time (Google Maps + WebSocket)
- Push notification (Firebase) + lonceng notif
- Sistem banding & refund (3 tahap)
- Diskon platform oleh admin + kuota
- Penjual favorit

### Sprint 5: Admin + Polish
- Dashboard admin + 6 grafik analitik
- Kelola penjual, pembeli, menu, ulasan
- Kelola banding (admin approve â†’ penjual wajib refund)
- Rekap keuangan
- Responsive design (mobile-first)
- Testing & bug fixing

---

## Verification Plan

### Automated Tests
- Test auth: register, login, role-based access
- Test CRUD menu + info gizi
- Test alur order end-to-end
- Test perhitungan komisi 12% otomatis
- Test alur diskon (kuota habis â†’ diskon hilang)
- Test alur banding 3 tahap

### Manual Verification
- Alur lengkap: Daftar â†’ Login â†’ Cari Menu â†’ Pesan â†’ Bayar (Midtrans) â†’ Tracking GPS â†’ Terima â†’ Ulasan
- Verifikasi dashboard admin: total pendapatan, 6 grafik, kelola banding
- Verifikasi pembayaran Midtrans (sandbox mode)
- Responsive test di mobile

---

> [!IMPORTANT]
> **Ini adalah project yang cukup besar** (full-stack, payment gateway, GPS, real-time notification). Estimasi waktu development: **3-5 minggu** untuk semua fitur. Apakah ada deadline tertentu?

