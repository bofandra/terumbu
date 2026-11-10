# Terumbu.eco Impact Map — SEO & Brand Handoff

Tanggal export: 10 November 2026
Bahasa default: Indonesia (`id`) · Mata uang default: IDR
Canonical host: `https://terumbu.world` (ubah via `NEXT_PUBLIC_SITE_URL`)

## 1. /impact-map

| Elemen | ID (default, ter-render di HTML) | EN (toggle client) |
|---|---|---|
| Title | Peta Dampak Konservasi Pesisir Indonesia \| Terumbu.eco | Coastal Conservation Impact Map in Indonesia \| Terumbu.eco |
| Meta description | Lihat lokasi konservasi pesisir Indonesia, baca catatan dari lapangan, dan cek status verifikasi restorasi mangrove, terumbu karang, serta bersih pantai bersama Terumbu.eco. | Explore coastal conservation sites in Indonesia, read field notes, and check the verification status of mangrove, coral, and beach cleanup work with Terumbu.eco. |
| H1 | Lihat langsung dampak konservasi di pesisir Indonesia | Trace conservation impact along Indonesia’s coast |
| Canonical | `/impact-map` | — |
| OG / Twitter image | `/assets/impact/mangrove-conservation-2026.jpg` (1600×902) | — |

> **Perubahan dari halaman live:** title live saat ini "Impact Map | Terumbu.world" (tanpa keyword, bahasa Inggris). Title ID di atas melanjutkan versi kode produksi sebelumnya ("Peta Dampak Konservasi Indonesia | Terumbu.eco") dengan tambahan "Pesisir". Samakan keyword final dengan `terumbu-seo-url-plan-keyword-map.xlsx`.

## 2. Structured data (JSON-LD, ter-render server-side)

- `WebPage` (+ `WebSite` induk), `BreadcrumbList` (Beranda → Peta Dampak), `FAQPage` (5 Q&A).
- JSON-LD dibangkitkan dari `content/impact-map.ts` yang sama dengan teks di halaman, jadi FAQ schema selalu identik dengan FAQ yang terlihat (syarat Google).
- Sengaja **tidak** ada `geo`/koordinat di schema: lokasi publik bersifat perkiraan untuk melindungi kawasan sensitif.
- `app/sitemap.ts` → `/sitemap.xml`, `app/robots.ts` → `/robots.txt`.

## 3. Alt text

| Penggunaan | ID | EN |
|---|---|---|
| Logo | Logo Terumbu.eco | Terumbu.eco logo |
| Hero | Peserta berjalan di area konservasi mangrove bersama pemandu lokal | Participants walking through a mangrove conservation area with a local guide |
| Peta | `role="region"` + `aria-label` "Peta lokasi konservasi pesisir Indonesia"; pin punya `title`/`alt` nama lokasi | Map of coastal conservation sites in Indonesia |

Kartu "Catatan dari lapangan" memakai ikon SVG dekoratif (`aria-hidden`), bukan foto, supaya tidak ada foto stok yang tampak seperti bukti lapangan.

## 4. Heading outline

H1 (hero) → H2 "Cari proyek sesuai jenis kegiatan dan status buktinya" (H3 nama lokasi di kartu detail) → H2 "Catatan dari lapangan" (H3 per catatan) → H2 "Baca dampaknya lewat konteks, bukan cuma angka" → H2 "Dua istilah yang sering tertukar" (H3 ×2) → H2 FAQ → H2 CTA.

## 5. Copywriting

- Bahasa Indonesia dulu, nada hangat dengan "kamu"; istilah asing (milestone, level verifikasi) dibiarkan English bila lazim. EN diterjemahkan dari ID.
- Tanpa eyebrow/label kecil di atas heading.
- Status "masih ditinjau" ditampilkan jujur (lokasi Raja Ampat), tidak dihitung sebagai terverifikasi.

## 6. Keterbatasan & rekomendasi

1. **Bahasa Inggris tidak punya URL sendiri.** Toggle EN hanya mengganti teks di browser, jadi Google hanya mengindeks versi Indonesia dan `hreflang` tidak bisa dipasang. Jika EN ingin dirangking, buat route `/en/impact-map` dengan hreflang `id`/`en`/`x-default` (keputusan produk, pola sama dengan homepage dan expeditions).
2. **Data statis.** Angka dan lokasi mengikuti halaman live 10 Nov 2026 dan harus diganti dengan data DB. Setelah itu, pertimbangkan `lastmod` di sitemap dari tanggal pembaruan data.
3. **Peta tidak terindeks.** Konten peta (Leaflet) dirender client. Daftar lokasi dan detail tetap ada di HTML server sehingga terbaca crawler.
4. **Meta description ID** ±170 karakter; kemungkinan terpotong di SERP. Versi lebih pendek dapat diubah di `seo.id.description`.
5. Tile OpenStreetMap: ikuti kebijakan penggunaan OSM untuk trafik produksi.
6. Foto hero dari galeri Youth; cek izin foto peserta.
7. Jangan menambah `AggregateRating` atau klaim angka dampak baru tanpa data terverifikasi.

## 7. Token brand

Sama dengan halaman expeditions: ink `oklch(20% .02 250)`, ocean `oklch(49% .19 258)`, ocean deep `oklch(28% .13 260)`, lime `oklch(88% .18 112)`, coral `oklch(67% .17 32)` (teks coral `oklch(52% .17 32)` agar kontras cukup); font display Space Grotesk, body DM Sans.
