# Belanja

PWA daftar belanja pribadi dengan riwayat dan scan struk. Satu pengguna, satu list aktif; tanpa login atau server data.

## Jalankan

Node.js 22 atau lebih baru dan pnpm diperlukan (Capacitor 8 menggunakan Node.js 22+).

```sh
pnpm install
pnpm dev
```

Buka **http://localhost:5173**. `pnpm dev` membuat build lalu menjalankan preview. Setelah mengubah kode, hentikan dan jalankan ulang preview, lalu gunakan tombol **Perbarui** jika ada versi baru. Untuk pemeriksaan kode tanpa cache lama, gunakan profil browser baru.

```sh
pnpm test
pnpm build
pnpm start
```

Hasil build ada di `dist/`; bisa dipasang pada hosting statis dengan HTTPS pada root domain. Tidak ada layanan API, environment secret, atau database server yang harus disiapkan.

## Alur

- Tambah barang melalui autocomplete bahan makanan Indonesia; jumlah dan satuan opsional. Tap baris untuk ceklis, ikon pensil untuk mengubah. Ceklis dan hapus dapat diurungkan sesaat.
- **Selesai belanja** aktif setelah semua barang terceklis. Pilih scan struk atau simpan tanpa struk.
- Ambil foto lewat kamera atau pilih galeri. OCR membaca foto di perangkat menggunakan Tesseract; hasilnya harus diperiksa. Nama produk, harga per baris dan total bayar dapat dikoreksi; produk juga bisa ditambah atau dihapus.
- Harga produk adalah total untuk baris struk tersebut, bukan harga per unit. Total bayar dicatat terpisah agar diskon/pajak tidak disamarkan. Selisih ditampilkan untuk diperiksa.
- Riwayat menyimpan waktu selesai, list awal, barang aktual, harga, total bayar dan foto. Struk dapat ditambahkan ke belanja lama tanpa mengubah list aktif atau tanggal belanja lama.
- Scan yang belum selesai disimpan sebagai draft. List baru dikosongkan sesudah transaksi penyimpanan riwayat dan foto berhasil.

## PWA dan data

Aplikasi, font, ikon, mesin OCR dan model bahasa disertakan dalam build serta dicache untuk offline. Instalasi pertama perlu internet dan mengunduh sekitar 40 MB aset. Tunggu status **Siap dipakai offline** pada Riwayat sebelum mencoba mode pesawat. Model bahasa Inggris mendukung huruf Latin pada struk Indonesia; singkatan produk dan foto buruk tetap perlu koreksi manual.

Di iPhone, buka URL HTTPS melalui Safari → Bagikan → Tambahkan ke Layar Utama. Kamera, service worker dan instalasi PWA memerlukan HTTPS, kecuali pada localhost di komputer. URL HTTP jaringan lokal bisa dipakai mengecek tampilan tetapi tidak cukup untuk instalasi/offline di iPhone.

Data berada di IndexedDB pada perangkat dan browser yang digunakan. Foto tidak dikirim ke layanan luar. Menghapus data situs/browser dapat menghapus list dan riwayat; sinkronisasi antarperangkat dan backup belum termasuk MVP. Penyimpanan persisten diminta setelah menyimpan struk, tetapi kebijakan browser tetap berlaku.

## Struktur

`src/app.js` mengelola layar dan interaksi; `domain.js` menjaga aturan list/arsip; `storage.js` melakukan transaksi atomik dan pemeriksaan versi antar-tab; `receipt.js` membaca nominal dan baris struk; `ocr.js` menyiapkan foto dan menjalankan OCR. `scripts/build.mjs` menyalin aset dan menghasilkan service worker dengan versi berdasarkan isi build.

`pnpm test` menguji aturan arsip, validasi, autocomplete, dan parser struk. `tests/browser.mjs` menguji alur nyata dengan Chrome/Playwright termasuk OCR, reload, lampiran riwayat, rollback penyimpanan, dan offline. Untuk menjalankannya, sediakan paket `playwright` (atau isi `PLAYWRIGHT_MODULE` dengan lokasi modul yang sudah tersedia), jalankan preview, lalu `node tests/browser.mjs`.

Referensi visual: [Figma Belanja](https://www.figma.com/design/VxHTl9pk3bRZ3xBjGjkQiA). Ikon navigasi dan ceklis diambil dari desain tersebut. Dokumentasi OCR: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

## APK Android

Hasil build APK untuk uji pribadi: `artifacts/Belanja-0.1.0-debug.apk`. APK, ZIP deployment, SDK, dependency dan kunci tanda tangan tidak disimpan di Git; buat ulang melalui skrip di bawah. Ini adalah build debug bertanda tangan, bukan rilis Play Store. Paket berisi seluruh UI, font, OCR dan model bahasa sehingga tidak memerlukan hosting atau unduhan aset saat pertama dibuka. Service worker hanya dijalankan pada versi PWA; versi Android menggunakan aset lokal dalam APK.

Salin APK ke HP Android, buka melalui aplikasi Files, izinkan pemasangan dari aplikasi tersebut bila diminta Android, lalu tap Instal. Nama aplikasi: **Belanja**; ID: `id.belanja.personal`; versi: `0.1.0`. Minimum Android 7/API 24, dengan Android System WebView yang diperbarui. Kamera dan galeri menggunakan plugin native Capacitor; tombol kembali menutup sheet/navigasi, lalu meminimalkan aplikasi pada layar List Belanja.

Data PWA dan APK terpisah. Tidak ada migrasi otomatis dari browser. Android backup dimatikan untuk menjaga data/foto di perangkat. Menghapus data aplikasi atau uninstall menghapus data lokal; untuk update, pasang APK baru di atas aplikasi lama dengan ID dan kunci tanda tangan yang sama.

Build ulang pada Windows:

```powershell
./scripts/setup-android.ps1  # cukup sekali, mengunduh SDK dan JDK resmi
pnpm android:build
```

Alat, SDK, cache Gradle dan kunci debug berada di `.android-tools/` pada drive proyek. Skrip memverifikasi checksum unduhan JDK/SDK dan tanda tangan APK. Android Studio tidak diperlukan untuk build melalui alat SDK ini; proyek `android/` tetap dapat dibuka di Android Studio bila diinginkan.

Pertahankan `.android-tools/signing/debug.keystore` untuk update build uji berikutnya. Kunci debug tidak cocok untuk distribusi produksi; rilis publik nanti perlu kunci rilis tersendiri dan proses rilis. File SHA-256 APK ada di `artifacts/Belanja-0.1.0-debug.apk.sha256`.

Pengujian Android opsional memakai `scripts/setup-emulator.ps1`; perangkat uji dan cache emulator juga disimpan di `.android-tools/`. Foto kamera dari HP sungguhan tetap perlu pemeriksaan dengan struk nyata.

`scripts/verify-apk.py` memeriksa setiap aset dalam APK terhadap build web, termasuk model bahasa `.gz` yang diekspansi AAPT menjadi `.traineddata`. OCR menggunakan `gzip: false` di Android dan `gzip: true` di PWA. Jalankan dengan Python, atau isi `BELANJA_PYTHON` sebelum build untuk pemeriksaan otomatis.

Build dan tanda tangan APK sudah diverifikasi, serta alur browser dan OCR offline lolos pengujian. Emulator di komputer build ini belum berhasil boot tanpa akselerasi virtualisasi; APK belum diuji di HP fisik. Hasil pemeriksaan paket dicatat dalam `artifacts/verification.json`.

`tests/apk-ocr.mjs` juga berhasil menjalankan OCR sungguhan pada Chromium memakai aset yang diekstrak dari APK, dengan cabang Android (`gzip: false`) dan tanpa permintaan ke layanan luar. Ini memverifikasi format paket OCR, bukan kamera atau runtime WebView pada perangkat Android.

## Hosting Cloudflare

Deployment aktif saat ini menggunakan **Cloudflare Workers Static Assets** pada [Belanja](https://throbbing-bread-b3df.veagul-pepito.workers.dev/). Alur daftar, riwayat, OCR dan reload/scan saat offline sudah lolos pengujian Chromium pada URL tersebut. Belum diuji pada iPhone fisik. Bukti pemeriksaan ada di `artifacts/cloudflare-verification.json`.

Build PWA dan paket Direct Upload:

```sh
pnpm build
python scripts/package-cloudflare.py
```

Unggah `artifacts/Belanja-PWA-Cloudflare.zip` melalui dashboard Cloudflare Pages. Paket memakai alamat bawaan HTTPS `*.pages.dev`; tidak membutuhkan domain berbayar, backend, token API di aplikasi, atau koneksi GitHub. Panduan ada di `artifacts/UPLOAD-CLOUDFLARE.md`.

File `_headers` adalah konfigurasi Cloudflare dan sengaja tidak dimasukkan ke daftar precache. Browser tetap menggunakan model `.traineddata.gz`; perubahan model tanpa `.gz` hanya berlaku pada APK Android.
