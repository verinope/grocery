# Unggah Belanja ke Cloudflare Pages (gratis)

File siap unggah: **Belanja-PWA-Cloudflare.zip**. ZIP berisi build PWA saja, dengan `index.html` di tingkat teratas. OCR, font dan ikon sudah disertakan; tidak ada data belanja pribadi di paket.

1. Di dashboard Cloudflare, buka **Workers & Pages**.
2. Pilih **Create application**, kemudian jalur **Pages / Upload assets / Drag and drop**. Nama tombol bisa berbeda menurut tampilan dashboard.
3. Gunakan nama proyek **belanja-mvp**, atau nama lain bila sudah dipakai.
4. Pilih/seret **Belanja-PWA-Cloudflare.zip** ke area upload.
5. Pilih **Deploy / Deploy site** dan tunggu sampai selesai. Tidak perlu membeli domain atau memilih paket berbayar.
6. Salin URL proyek `https://nama-proyek.pages.dev`. Gunakan URL proyek utama ini untuk pemasangan di iPhone supaya penyimpanan tetap pada alamat yang sama setiap update.

Di iPhone: buka URL melalui Safari → Bagikan → Tambahkan ke Layar Utama → buka ikon Belanja saat masih online → masuk Riwayat dan tunggu **Siap dipakai offline**. Kemudian coba mode pesawat. Data localhost pada komputer tidak otomatis pindah ke iPhone.

Paket diperiksa terhadap batas upload dashboard Cloudflare: kurang dari 1.000 file dan masing-masing file di bawah 25 MiB. File `_headers` mengatur respons deployment; file ini tidak dimasukkan ke cache offline karena Cloudflare tidak menyajikannya sebagai aset publik.

Setelah mengubah aplikasi, jalankan build dan buat ulang ZIP, lalu unggah sebagai deployment baru pada **proyek yang sama**.

Dokumentasi resmi: https://developers.cloudflare.com/pages/get-started/direct-upload/
