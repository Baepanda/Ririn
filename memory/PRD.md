# PRD — Golden (Inventaris, POS & Keuangan Emas)

## Problem Statement (original)
Aplikasi "Golden" untuk toko perhiasan emas (HP & tablet, real-time, scan barcode kamera).
Inventaris barang, transaksi jual beli, pendataan & pelaporan keuangan.
4 tingkat user: Owner, Warehouse, Accounting, Karyawan — tiap tingkat dashboard berbeda &
tidak bisa melihat menu satu sama lain kecuali Owner (mengepalai semua).

## User Choices
- Login: Owner membuat akun (username + password). 3x salah password → akun terkunci,
  Owner buka blokir & reset. Owner login: **AditCEO / Adit123**.
- Warehouse upload foto barang (cloud storage aman).
- 1 QR unik per unit barang. Barang keluar inventaris hanya setelah **scan + cetak nota** (bukan scan saja).
- Kalkulator harga emas lengkap (modal + ongkos → margin/laba kotor/laba bersih).
- Tema terang, putih dengan aksen emas.
- Cloud: Emergent (MongoDB + Object Storage).

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT auth (bcrypt), routes prefixed `/api`.
- Frontend: Expo Router (React Native, mobile + tablet responsive). React Query, keyboard-controller.
- Storage: Emergent Managed Object Storage untuk foto barang.
- Roles enforced server-side via `require_role`; client via `RoleGuard` + role-based route groups.

## Personas
- **Owner**: kontrol penuh — summary keuangan, ACC harga, laporan, data pegawai (+gaji), kalkulator.
- **Warehouse**: input barang masuk (QR otomatis), cetak QR, stock opname.
- **Accounting**: rekap penjualan harian, daftar transaksi.
- **Karyawan**: lihat stok + foto, scan/pilih barang, input harga jual, cetak nota.

## Implemented (2026-06)
- Auth JWT + lockout 3x + owner unblock/reset. Seed: AditCEO(owner), gudang, akun, karyawan.
- User management (owner): create/list/edit/reset-password/unblock/soft-delete + data pribadi lengkap (gaji, jabatan, KTP, alamat, email, kontrak, lama kerja).
- Inventory: warehouse input barang (quantity → N unit, QR unik 12-char), foto upload, cetak label QR (0.8cm HTML print).
- POS Karyawan: grid produk (responsive tablet split), scan QR kamera (izin kontekstual), keranjang, input harga jual, preview keuntungan.
- Sales lifecycle: pending_approval → owner approve/reject → complete (pembayaran tunai/transfer/debit/kredit; no. transaksi wajib untuk transfer/debit) → barang keluar inventaris + nomor nota + cetak nota.
- Accounting: rekap harian (per metode, total, laba) + navigasi tanggal; daftar transaksi selesai.
- Owner: command center summary (omzet, laba kotor, margin, stok, nilai stok, pending), approval, laporan (keuangan + stock opname approve, filter mingguan/bulanan/tahunan), kalkulator harga emas.
- Stock opname (warehouse): buat laporan fisik vs sistem per periode, owner ACC.
- Backend tested: 15/15 pytest pass.

## Backlog
- P1: Rate-limit login by IP; auth token untuk /api/files; atomic receipt counter.
- P1: Status guard pada endpoint reject sales.
- P2: Export laporan PDF/Excel; grafik tren penjualan; multi-cabang.
- P2: Desain nota kustom (menunggu desain dari user).

## Next Tasks
- Kustomisasi desain nota penjualan (user akan berikan desain).
- Uji di perangkat nyata untuk kamera scan & cetak (Expo Go/build).

## Update 2 (2026-06)
- Barang masuk dari Warehouse kini berstatus `pending_acc` → wajib di-ACC Owner sebelum masuk inventaris ready. Endpoint: `/items/{id}/approve|reject|damage|restore`. Status barang: pending_acc, in_stock (ready), sold, damaged, rejected.
- Approval Owner punya 2 segmen: **Harga** (transaksi) & **Barang Masuk** (ACC/tolak barang).
- Dashboard Owner semua kartu bisa diklik:
  - Total Omzet → Laporan Penjualan (Harian/Mingguan/Bulanan/Tahunan) dengan no. transaksi, tanggal, nama barang & harga jual.
  - Stok Barang & Nilai Stok → daftar stok (tab Ready/Terjual/Rusak) dengan foto & harga.
  - Menunggu ACC → layar Approval.
  - Transaksi Selesai → daftar transaksi per Harian/Mingguan/Bulanan/Tahunan.
- Warehouse inventaris menampilkan badge status + aksi tandai rusak / kembalikan.

## Update 3 (2026-06)
- **Grafik Tren Omzet** di dashboard Owner (react-native-gifted-charts): toggle Harian (7 hari) / Bulanan (6 bulan). Endpoint `/api/reports/trend?type=daily|monthly`.
- **Pencarian barang** di Inventaris (Warehouse) & Stok (Owner): filter realtime nama / kode QR / kategori.
- **Riwayat barang rusak**: saat tandai rusak, Warehouse mengisi alasan; tersimpan `damage_reason`, `damaged_at`, `damaged_by_name`; tampil di tab Rusak (Owner) & daftar Warehouse. Endpoint `/items/{id}/damage` menerima body `{reason}`.
