# Update Belanja di Cloudflare

File siap unggah: **Belanja-PWA-Cloudflare.zip**, di folder `E:\Grocery\artifacts`. ZIP berisi build PWA saja, dengan `index.html` di tingkat teratas. Katalog 100 resep, OCR, font dan ikon sudah disertakan; tidak ada data belanja pribadi di paket.

1. Di dashboard Cloudflare, buka **Workers & Pages**.
2. Buka Worker yang sudah digunakan: **throbbing-bread-b3df**. Gunakan proyek yang sama agar alamat aplikasi tetap.
3. Dari dashboard Worker, buka proses update deployment/aset. Nama tombol dapat berbeda menurut tampilan dashboard; bila opsi upload tidak tersedia, gunakan Wrangler setelah login Cloudflare.
4. Pilih/seret **Belanja-PWA-Cloudflare.zip** ke area upload aset.
5. Deploy versi baru dan tunggu sampai selesai. Tidak perlu membeli domain atau memilih paket berbayar.
6. Buka [Belanja](https://throbbing-bread-b3df.veagul-pepito.workers.dev/). Pada pemasangan lama, tap **Perbarui** saat muncul. Katalog resep akan tersedia melalui **Mau masak apa?** di List Belanja.

Di iPhone: buka URL melalui Safari → Bagikan → Tambahkan ke Layar Utama → buka ikon Belanja saat masih online → di List Belanja, tunggu **Siap dipakai offline**. Kemudian coba mode pesawat. Data localhost pada komputer tidak otomatis pindah ke iPhone.

Paket diperiksa terhadap batas upload dashboard Cloudflare: kurang dari 1.000 file dan masing-masing file di bawah 25 MiB. File `_headers` mengatur respons deployment; file ini tidak dimasukkan ke cache offline karena Cloudflare tidak menyajikannya sebagai aset publik.

Setelah mengubah aplikasi, jalankan build dan buat ulang ZIP, lalu unggah sebagai deployment baru pada **proyek yang sama**.

Dokumentasi resmi: [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/), [Workers Direct Uploads](https://developers.cloudflare.com/workers/static-assets/direct-upload/).
