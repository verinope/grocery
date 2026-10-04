from pathlib import Path
from html import escape

out = Path(__file__).resolve().parents[1] / 'artifacts/designs'
out.mkdir(parents=True, exist_ok=True)
parts=[]
green='#3b7a57'; ink='#20231f'; muted='#707b70'; line='#e3e8df'; paper='#fafaf7'
def rect(x,y,w,h,fill,rx=0,stroke='none'):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>')
def text(x,y,s,size=14,color=ink,weight=400):
    parts.append(f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}" font-family="Inter,Arial,sans-serif">{escape(s)}</text>')
def lines(x,y,ss,size=14,color=muted,lh=22,weight=400):
    for i,s in enumerate(ss): text(x,y+i*lh,s,size,color,weight)
def path(d,color=green,width=2):
    parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')
def check(x,y,on=False):
    rect(x,y,22,22,green if on else paper,7,green if on else '#bbc5b7')
    if on:path(f'M{x+5} {y+11} l4 4 l8 -9','#ffffff')
def btn(y,label,kind='primary'):
    rect(24,y,342,49,green if kind=='primary' else '#edf4ec',14)
    text(42,y+30,label,14,'white' if kind=='primary' else green,600)
def tag(x,y,label,w=100):
    rect(x,y,w,26,'#edf4ec',13);text(x+11,y+18,label,11,green,500)
def nav():
    rect(0,701,390,79,'#ffffff');path('M0 701H390',line,1)
    text(59,739,'List Belanja',13,green,600);text(259,739,'Riwayat',13,muted)
    rect(130,765,130,4,'#20231f',2)
def heading(title,sub=None,back=True):
    text(24,30,'9:41',12,ink,600);text(311,30,'•••  ▰',12,ink)
    if back:
        path('M36 61l-8 8 8 8');text(49,74,'Kembali',12,green)
    else:text(24,78,'belanja.',23,green,700)
    text(24,122,title,27,ink,600)
    if sub:text(24,148,sub,12,muted)
def row(y,name,qty,on=False):
    check(25,y+9,on);text(61,y+24,name,15,ink,500);text(61,y+46,qty,12,muted)
    path(f'M340 {y+30} l10 -10 l4 4 l-10 10 l-5 1 Z',muted,1.5)
    path(f'M24 {y+66}H366',line,1)
def phone(x,y,num,title,notes):
    text(x,y-60,num+' / '+title,17,ink,600)
    rect(x,y,390,780,paper,24,line)
    parts.append(f'<g transform="translate({x},{y})">')
def endphone(x,y,notes):
    parts.append('</g>');lines(x,y+811,notes,13,muted,21)

parts.append('<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="2440" viewBox="0 0 1440 2440"><title>Belanja — Recipe feature review flow</title><desc>Six proposed screens for an optional recipe flow. Existing shopping and history flows remain unchanged. No serving controls or automatic quantity merging.</desc>')
rect(0,0,1440,2440,'#f0f2ed')
tag(70,45,'PROPOSAL · UNTUK REVIEW',215)
text(70,123,'Dari ide masak, ke list belanja.',42,ink,600)
lines(70,163,['Fitur Resep sebagai jalur tambahan. Belanja manual tetap menjadi flow utama.',
                  'Tanpa pengaturan porsi. Pengguna menentukan jumlah sendiri lewat edit barang.'],17,muted,28)
rect(70,221,1300,66,'#ffffff',16)
text(94,249,'ALUR UTAMA TETAP',11,green,700)
text(94,272,'Tambah barang → ceklis di supermarket → selesai belanja → scan struk / simpan → riwayat',15)

x,y=70,385
phone(x,y,'01','Akses opsional',[]);heading('List Belanja','Sedikit persiapan, belanja lebih tenang.',False)
text(24,195,'2 barang belum diambil',12,muted);text(291,195,'+ Tambah',13,green,600)
row(212,'Bawang putih','2 siung');row(283,'Beras','1 kg')
rect(24,384,342,75,'#edf4ec',14);text(42,412,'Mau masak apa?',16,green,600)
text(42,435,'Cari ide dari resep',13,green);path('M343 413l7 7-7 7')
text(24,564,'0 dari 2 barang',12,muted);text(286,564,'Masuk troli',12,muted)
rect(24,581,342,5,line,3);rect(24,607,342,49,'#e3e8df',14)
text(118,637,'Selesai belanja',14,'#8b9588',600)
text(33,682,'Centang semua barang untuk menyelesaikan.',11,muted);nav()
endphone(x,y,['Usulan pintu masuk sekunder, bukan langkah wajib.','Navigasi tetap List Belanja dan Riwayat.'])

x,y=525,385
phone(x,y,'02','Temukan resep',[]);heading('Resep','100 resep masakan Indonesia.')
rect(24,176,342,46,'#ffffff',12,line);text(42,205,'Cari nama masakan',13,muted)
tag(24,240,'Semua',72);text(115,258,'Lauk',12,muted);text(183,258,'Sayur',12,muted);text(263,258,'Praktis',12,muted)
for cy,name,sub,label in [(292,'Ayam kecap','Gurih manis, bahan mudah dicari.','AYAM'),(419,'Tumis kangkung','Sayur sederhana untuk sehari-hari.','SAYUR'),(546,'Telur dadar sayur','Praktis dengan bahan rumahan.','TELUR')]:
    rect(24,cy,342,109,'#ffffff',16,line);text(42,cy+25,label,10,green,700)
    text(42,cy+52,name,18,ink,600);text(42,cy+78,sub,12,muted)
    path(f'M341 {cy+42}l7 7-7 7',muted)
text(24,701,'Pilih masakan, lalu pilih bahan yang perlu dibeli.',12,muted)
endphone(x,y,['Katalog awal: 100 resep dalam 8 kategori.','Pencarian hanya berdasarkan nama masakan.'])

x,y=980,385
phone(x,y,'03','Lihat resep',[]);heading('Ayam kecap','Gurih manis, bahan mudah dicari.')
tag(24,178,'Resep rumahan',122)
text(24,246,'Bahan',19,ink,600);text(24,274,'Takaran berikut sebagai referensi.',12,muted)
for iy,name,qty in [(313,'Ayam','500 g'),(349,'Bawang putih','3 siung'),(385,'Kecap manis','3 sdm'),(421,'Garam','Secukupnya')]:
    text(24,iy,name,14);text(267,iy,qty,13,muted)
path('M24 449H366',line,1)
text(24,488,'Cara memasak',19,ink,600)
lines(24,521,['1. Tumis bawang putih hingga harum.',
                 '2. Masukkan ayam, kecap, garam, dan air.',
                 '3. Masak hingga ayam matang dan empuk.'],13,muted,29)
btn(653,'Pilih bahan untuk dibeli')
text(34,734,'Jumlah belanja bisa kamu ubah di list nanti.',12,muted)
endphone(x,y,['Resep berisi bahan dan langkah memasak.','Tidak ada pilihan atau perhitungan porsi.'])

x,y=70,1435
phone(x,y,'04','Pilih yang perlu dibeli',[]);heading('Pilih bahan','Dari resep Ayam kecap')
rect(24,176,342,60,'#edf4ec',12);lines(39,199,['Pilih yang belum ada di rumah.',
                                                    'Jumlah bisa diubah setelah masuk list.'],12,green,19)
check(25,264,True);text(61,282,'Ayam',15,ink,500);text(61,305,'Referensi: 500 g',12,muted)
path('M24 324H366',line,1)
rect(24,339,342,93,'#f0f2ed',12);text(40,365,'Bawang putih',15,ink,500)
text(40,391,'Sudah di list · 2 siung',12,muted);text(264,416,'Edit jumlah',12,green,600)
check(25,457,True);text(61,475,'Kecap manis',15,ink,500);text(61,498,'Referensi: 3 sdm',12,muted)
path('M24 518H366',line,1)
check(25,545);text(61,563,'Garam',15,ink,500);text(61,586,'Referensi: secukupnya',12,muted)
text(24,632,'2 bahan dipilih',13,green,600);btn(653,'Tambahkan 2 bahan ke list')
endphone(x,y,['Bawang putih tidak dibuat ulang atau dijumlahkan.','“Edit jumlah” membuka editor barang yang ada.','Tanpa pilihan: tombol Tambahkan dinonaktifkan.'])

x,y=525,1435
phone(x,y,'05','Konfirmasi penambahan',[]);heading('Bahan ditambahkan',None)
rect(146,187,98,98,'#edf4ec',49);path('M174 235l14 14 31-33',green,4)
text(61,335,'2 bahan masuk ke list',24,ink,600)
lines(54,372,['Ayam dan kecap manis sudah ditambahkan.',
              'Bawang putih tetap memakai jumlah lama.'],13,muted,25)
rect(24,430,342,116,'#ffffff',16,line)
text(42,461,'Ayam',15,ink,500);text(267,461,'500 g',13,muted)
path('M42 483H348',line,1)
text(42,515,'Kecap manis',15,ink,500);text(267,515,'3 sdm',13,muted)
btn(580,'Lihat list belanja');btn(643,'Cari resep lain','secondary')
text(37,736,'Sesuaikan jumlah dengan kebutuhan belanjamu.',12,muted)
endphone(x,y,['Berhasil hanya tampil setelah bahan tersimpan.','Jika gagal: tetap di pilihan bahan + Coba lagi.','Tap berulang tidak menambahkan bahan dua kali.'])

x,y=980,1435
phone(x,y,'06','Kembali ke list utama',[]);heading('List Belanja','Sedikit persiapan, belanja lebih tenang.',False)
text(24,195,'4 barang belum diambil',12,muted);text(291,195,'+ Tambah',13,green,600)
row(212,'Bawang putih','2 siung');row(283,'Beras','1 kg');row(354,'Ayam','500 g');row(425,'Kecap manis','3 sdm')
text(24,564,'0 dari 4 barang',12,muted);text(286,564,'Masuk troli',12,muted)
rect(24,581,342,5,line,3);rect(24,607,342,49,'#e3e8df',14);text(118,637,'Selesai belanja',14,'#8b9588',600)
text(33,682,'Centang semua barang untuk menyelesaikan.',11,muted);nav()
endphone(x,y,['Barang baru berstatus belum diambil.','Ikon pensil memakai flow edit jumlah yang ada.','Ceklis → selesai → struk → riwayat tetap sama.'])

rect(70,2350,1300,46,'#e4ebdf',12)
text(90,2379,'REVIEW  ·  Pintu masuk Resep  /  Referensi takaran  /  Bahan yang sudah di list  /  Kembali ke belanja',14,green,500)
parts.append('</svg>')
(out/'recipe-flow-review.svg').write_text('\n'.join(parts),encoding='utf-8')
print(str(out/'recipe-flow-review.svg'))
