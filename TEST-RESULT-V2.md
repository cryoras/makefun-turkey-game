# Gobble Run v2 — hasil sesi art direction

Tanggal: 27 November 2026. Commit lokal saja; tidak push, submit, atau menjalankan tool bundle/check. **Gate performa BELUM LULUS.** Art direction dan fix logika selesai; jangan mengartikan commit sebagai persetujuan performa atau persetujuan pemilik.

## Audit renderer sesi 1

State awal uncommitted diverifikasi terhadap log 23d6f1b. `main.js` memang mengalihkan gameplay SwiftShader ke Canvas 2D, tetapi `?shot=` memakai three.js. `../v2-after/results.json` mengonfirmasi string GPU berakhir `→ Canvas 2D`: 34,04 FPS / p95 66,7 ms tersebut bukan pengukuran gameplay 3D.

Pengalihan itu dihapus. Build final selalu memakai `Renderer3D`/`THREE.WebGLRenderer` saat WebGL tersedia, termasuk SwiftShader, baik gameplay maupun empat `?shot=`. Canvas 2D hanya saat context WebGL sama sekali tidak tersedia; jalur ini diuji dengan sengaja menonaktifkan WebGL. Error renderer lain tidak diam-diam disembunyikan sebagai fallback.

Screenshot memakai DPR 1 tetap di SwiftShader agar tajam dan deterministik. Gameplay software memakai DPR awal 0,35, adaptif minimum 0,25 sebagaimana batas ringan sesi 1; shadow map dan antialias tetap mati pada software. Hardware memakai cap DPR 1,75 yang sudah ada. Tidak ada pertukaran renderer untuk mendapatkan angka performa.

## Art direction: perbandingan visual

Patokan: seluruh `../INSPIRATION.md` dan deskripsi tekstual ref2; JPG referensi tidak disalin, dimuat, atau di-embed.

| Sebelum | Build final |
| --- | --- |
| Haze beige dekat, hijau/ochre kusam | Kanopi crimson/burnt orange/emas, evergreen hijau tua; gradasi peach ke biru dan haze jauh 48–100 m |
| Bidang tanah dan jalan polos | Soil cokelat, edge jalan gelap, 650 daun low-poly per tile, rumput, labu, jerami, corn stalks |
| Pohon blob seragam | Broadleaf faceted dan evergreen, ukuran/posisi seeded bervariasi |
| Kalkun kecil membelakangi kamera | Kamera lebih rendah, skala gameplay 1,22; pose three-quarter dengan muka/wattle terlihat, ekor eye-spots dan bobbing dipertahankan; sekitar 35–40% tinggi frame |
| Petani hijau/cokelat | Kemeja merah dengan garis plaid, topi jerami, pitchfork tiga gigi |
| Zona kurang berbeda | Red barn dengan trim terang, silo oranye; barn berbalok kayu, hay dan lentera; kitchen dinding hijau tua, kabinet cokelat, checkered floor, oven glow geometris, panci gantung |
| HUD kartu krem/serif | Panel ink translusen bertepi amber, angka skor besar, hati merah chunky, font rounded lokal; judul display dengan bingkai daun CSS |

## Performa: 10 detik gameplay, 1280×720, DPR konteks 1

Chromium headless: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. World normal dengan semua entity; invulnerability hanya mencegah game berakhir. Warm-up 2 detik. Pengukuran final tanpa Chromium pengujian lain berjalan bersamaan.

| Run | Renderer | FPS | p95 ms | Maks ms | Frame >100 ms |
| --- | --- | ---: | ---: | ---: | ---: |
| Bukti bug asli sesi 1 | 3D SwiftShader | 2,00 | 900 | 983,3 | 17 |
| Hasil sesi 1 | Canvas 2D di SwiftShader | 34,04 | 66,7 | 83,4 | 0 |
| Baseline sesi 2, sesudah menghapus switch Canvas, sebelum art | 3D SwiftShader | 5.59 | 316.6 | 366.6 | 48 |
| Build final | 3D SwiftShader | 10.71 | 183.3 | 266.6 | 31 |

**FAIL** target p95 <~50 ms dan **FAIL** nol frame >100 ms. Hasil bahkan belum mencapai kisaran 60–70 ms untuk renderer 3D. SwiftShader merasterisasi dengan CPU, bukan GPU fisik; pengurangan shader/geometri membantu tetapi tidak menghilangkan bottleneck di lingkungan ini. Tidak ada pengukuran GPU fisik, sehingga kelancaran pada perangkat pengguna belum dapat disimpulkan. `renderMs` hanya waktu CPU menyerahkan render, bukan frame-time GPU; angka RAF di atas yang menjadi patokan.

Baseline 237 draw calls / 115.088 segitiga; sampel final 47 calls / 26,056 segitiga. P95 final membaik terhadap baseline 3D yang sebanding, tetapi gameplay software masih lambat dan belum memenuhi brief performa. Angka 66,7 ms Canvas tidak digunakan sebagai baseline setara.

## Optimasi, elemen dibuang, dan fallback ref1

- Mesh statis digabung dengan vertex colors dan culling per bucket 14 m; obstacle/collectible memakai InstancedMesh per jenis, bukan satu draw call setiap objek. Entity batch digunakan ulang setelah restart.
- Pencahayaan sun/rim untuk mesh gabungan dihitung sekali ke vertex color. Shader PBR/lighting per-fragment pada mesh tersebut diganti; lighting dunia Lambert dan directional hangat tetap ada untuk mesh lain. Ini pencahayaan aproksimasi low-poly, bukan rim dinamis penuh.
- Sphere 12×9 disederhanakan ke 8×6, labu tujuh lobus terpisah diganti satu mesh faceted, butir jagung individual dibuang. Percobaan kumulatif menurunkan p95 sekitar 200 ke 183 ms sebelum hasil final; detail mentah di `verification/optimization-trials.json`. Pengukuran ini tidak mengisolasi biaya setiap ornamen satu per satu.
- Ref2 menjadi palet, kanopi api, langit dan haze. Hutan sangat rapat, volumetric light/debu dan bayangan dinamis lembut pada SwiftShader tidak ditambahkan karena anggaran render sudah terlampaui. Sebagai fallback ref1 yang disetujui, komposisi tetap diorama farm terbuka dengan barn/silo/labu, pohon low-poly dan lampu tanpa point-light tambahan. Bayangan software memakai ellipse kontak memanjang, bukan shadow map penuh. Tidak mengklaim bayangan seluruh kanopi atau volumetric golden hour telah tercapai.
- Tidak ada elemen baru yang diketahui memburukkan p95 dibanding baseline 3D sebelum art yang dipertahankan. Detail mahal di atas disederhanakan/dibuang; keseluruhan scene final lebih ringan. Tidak ada data yang membuktikan target 50 ms tercapai.

## Verifikasi bug dan regresi

- Memakai bukti `../REPRO-BUGS.md`; tidak membuat reproduksi baseline asli ulang.
- Stall 500 ms: 5 substep, dt maksimum 0.016667 s, simulasi total 0.083333 s. Clamp 100 ms dan cap 5 substep dipertahankan: PASS.
- Kamera x tetap 0, sejajar jalan; proyeksi lajur lintas 3 lajur × 3 zona memiliki drift 0.0 px (toleransi 2 px): PASS.
- Clone farm tidak lagi menerima offset gulir dua kali. Ketiga zona memakai tile utuh dengan clone pada offset lokal tetap. Kontinuitas diuji melalui semua vertex yang terlihat sebelum/sesudah wrap (dengan perpindahan normal 0,01 m), toleransi koordinat 0,001 m dan batas clipping diberi epsilon. Selisih awal barn ternyata vertex tepat z=8 m masuk/keluar akibat floating point; bukan lompatan scene.
- Zona 0: periode 210 m, 22747 vertex terlihat, kontinuitas PASS.
- Zona 1: periode 120 m, 9576 vertex terlihat, kontinuitas PASS.
- Zona 2: periode 126 m, 52290 vertex terlihat, kontinuitas PASS.
- `test-v2.mjs final`: delapan pemeriksaan non-performa PASS; dua gate performa FAIL; exit code 1 yang disengaja agar kegagalan tidak tertutup.
- `node ../test-turkey.mjs`: **28 PASS, 0 FAIL**. Skrip lama tidak diubah. Catatan ketidaksesuaian brief: file skrip yang tersedia menghasilkan 28 catatan PASS, bukan 35; semua pemeriksaan yang benar-benar ada telah dijalankan. Tidak mengarang tujuh hasil tambahan.
- Empat pasangan PNG identik byte demi byte: PASS determinisme. `window.__shotReady` dipakai untuk seluruh pengambilan.
- Console/page error: 0. External request: 0. Suite lama juga melaporkan 0/0. Tidak ada CDN, font jaringan, atau gambar referensi dalam game.
- Syntax JS dan `git diff --check`: PASS.
- `MAKEFUN_OUTPUT_DIR=/tmp/gobble-run-v2-dossier node main.ts`: PASS (ekspor lokal dossier saja).
- `main.ts`, `vendor/makefun-game.ts`, LICENSE, README.md dan `.makefun/owner.json` identik dengan HEAD awal. Folder kit, keypair dan `~/.makefun` tidak disentuh.

## Empat screenshot final

Semua dari build final 3D 1280×720, JPEG quality 82, masing-masing <256 KiB. Screenshot ini untuk preview/approval koordinator, bukan tanda submit.

| File | Byte | SHA-256 |
| --- | ---: | --- |
| [1-start.jpg](screenshots/1-start.jpg) | 92687 | `ef4a97daeda875b3675c9dbb583f2d00526b0e6b1dfe82120fe19b36bc40ab6c` |
| [2-play.jpg](screenshots/2-play.jpg) | 90597 | `43ec3f1daf6c846b4b3a69c8fe285ab3c301a9bb9fa219aab1e4bff674b0116d` |
| [3-chase.jpg](screenshots/3-chase.jpg) | 107261 | `89175e0dead3363ed7941cd86b61d71895e38a0bde6e79a368267be0426464f3` |
| [4-end.jpg](screenshots/4-end.jpg) | 79661 | `80137b96b466d4dd00a7dab94be85c399859675f110fce29e17363c14190411c` |

## Lokasi perubahan

- `game/src/main.js:10`: pemilihan 3D saat WebGL ada; `:16`: clamp/cap substep sesi 1.
- `game/src/config.js:3`: palet zona.
- `game/src/render3d.js:7`: karakter lingkungan/lighting/sky/dressing; `:34`: kitchen dan barn; `:46`: tiling; `:50`: komposisi kamera; `:52`: instancing entity.
- `game/src/geometry.js:3`: pencahayaan vertex dan batching/culling.
- `game/src/turkey.js:4`: material dan sphere ringan; `:12`: warna kalkun; `:17`: petani/plaid/pitchfork.
- `game/src/render2d.js:4`: fallback no-WebGL beresolusi normal dan palet selaras.
- `game/src/style.css:3`: art direction HUD/title; `:5`: end title tetap kompatibel dengan tes.
- `test-v2.mjs`: pemeriksaan renderer, performa, seam, lane, stall, determinisme dan exit code gate.
- `screenshots/1-start.jpg`, `2-play.jpg`, `3-chase.jpg`, `4-end.jpg`: seluruhnya diambil ulang.

Data mentah final tersedia di `verification/v2-results.json` dan `../v2-final/results.json`; PNG before/after di `../v2-before`, `../v2-after`, `../v2-final`. Baseline 3D sesi ini disimpan di `verification/baseline-3d.json`. Laporan ini juga disalin ke `../TEST-RESULT-V2.md` sesuai brief.
