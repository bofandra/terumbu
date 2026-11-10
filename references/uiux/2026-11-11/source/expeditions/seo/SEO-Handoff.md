# Terumbu.eco Expeditions — SEO & Brand Handoff

Tanggal export: 10 November 2026
Bahasa default: Indonesia (`id`) · Mata uang default: IDR
Canonical host: `https://terumbu.world` (ubah via `NEXT_PUBLIC_SITE_URL`)

## 1. /expeditions

| Elemen | ID (default, ter-render di HTML) | EN (toggle client) |
|---|---|---|
| Title | Ekspedisi Konservasi & Ekowisata Pesisir Indonesia \| Terumbu | Coastal Conservation Expeditions in Indonesia \| Terumbu |
| Meta description | Temukan ekspedisi pesisir Terumbu untuk mengenal alam, masyarakat, dan kehidupan pesisir secara langsung bersama pemandu lokal. | Find coastal expeditions with Terumbu to meet local communities, understand the environment, and learn through hands-on experiences. |
| H1 | Kenali kehidupan pesisir dari dekat | Get to know coastal life up close |
| Canonical | `/expeditions` | — |
| OG image | `/assets/expeditions/boat-youth.jpeg` | — |

> **Perubahan dari prototipe:** title prototipe adalah "Kenali Kehidupan Pesisir dari Dekat | Terumbu" (sama dengan H1, tanpa keyword). Diganti ke versi di atas agar memuat keyword "ekspedisi konservasi" + "ekowisata pesisir". Jika tidak setuju, ubah `listSeo` di `content/expeditions-page.ts`. Keyword final sebaiknya disamakan dengan `terumbu-seo-url-plan-keyword-map.xlsx`.

## 2. /expeditions/pulau-pramuka

| Elemen | ID | EN |
|---|---|---|
| Title | Ekspedisi Edukasi Laut Pulau Pramuka \| Terumbu | Marine Learning Expedition on Pramuka Island \| Terumbu |
| Meta description | Ikuti ekspedisi edukasi laut di Pulau Pramuka bersama pemandu lokal. Kenali mangrove, terumbu, kehidupan pesisir, dan aksi konservasi dalam satu hari yang bisa disesuaikan untuk sekolah atau kelompok. | Spend a day learning about mangroves, reefs, coastal life, and conservation action on Pramuka Island with a local guide. |
| H1 | Kenali & Belajar kehidupan pesisir lebih dekat. | Meet & learn coastal life up close. |
| Canonical | `/expeditions/pulau-pramuka` | — |
| OG image | `/assets/expeditions/boat-group.jpeg` | — |

> Catatan: meta description ID > 155 karakter, kemungkinan dipotong di SERP. Pertimbangkan versi lebih pendek.

## 3. Structured data (JSON-LD, ter-render server-side)

- `/expeditions`: `CollectionPage`, `ItemList` (3 ekspedisi), `BreadcrumbList`, `FAQPage` (15 Q&A).
- `/expeditions/pulau-pramuka`: `TouristTrip` (+ `Offer` IDR 750000), `BreadcrumbList`, `FAQPage` (4 Q&A).
- JSON-LD dibangkitkan dari file `content/` yang sama dengan teks di halaman, jadi FAQ schema selalu identik dengan FAQ yang terlihat (syarat Google). Versi prototipe sebelumnya memakai jawaban yang diringkas di schema; itu sudah disamakan.
- `app/sitemap.ts` → `/sitemap.xml`, `app/robots.ts` → `/robots.txt`.

## 4. Alt text

### /expeditions
| Penggunaan | ID | EN |
|---|---|---|
| Logo | Logo Terumbu.eco | Terumbu.eco logo |
| Hero | Peserta Terumbu naik perahu menuju lokasi lapangan pesisir | Terumbu participants on a boat heading to a coastal field site |
| Kartu Pramuka | Sekelompok peserta naik perahu di sekitar Pulau Pramuka | A group of participants on a boat around Pramuka Island |
| Kartu mangrove | Peserta berjalan di area konservasi mangrove | Participants walking through a mangrove conservation area |
| Kartu terumbu | Sekelompok peserta bersiap mengikuti kegiatan snorkeling dengan pemandu | A group of participants getting ready to snorkel with a guide |

### /expeditions/pulau-pramuka (galeri hero)
| # | ID |
|---|---|
| 1 | Peserta ekspedisi belajar laut di atas perahu menuju Pulau Pramuka |
| 2 | Peserta menjelajahi kawasan mangrove di Pulau Pramuka |
| 3 | Peserta mempelajari pembibitan mangrove bersama mitra lokal |
| 4 | Peserta belajar di antara akar mangrove |
| 5 | Peserta menikmati suasana pesisir saat matahari terbenam |

Versi EN ada di `content/pulau-pramuka.ts`. Slide non-aktif diberi `aria-hidden`.

## 5. Heading outline

- List: H1 → H2 "Perjalanan seperti apa yang kamu cari?" → H3 judul tiap kartu → H2 "Lebih dekat dengan alam…" → H2 FAQ.
- Detail: H1 → H2 pengalaman → H2 alur kegiatan (H3 per langkah) → H2 kebutuhan trip (H3 ×2) → H2 trip & konservasi → H2 FAQ → H2 CTA.

## 6. Perubahan kecil terhadap prototipe HTML

- Heading FAQ detail "Frequently Ask Question" → "Frequently Asked Questions" (typo grammar).
- Breadcrumb detail memakai `<nav aria-label>` + `aria-current`.
- Link kartu memiliki `aria-label` unik ("Lihat detail: <judul>") agar tidak ada tiga link identik.
- Tombol WhatsApp memakai `rel="noopener noreferrer"`.
- Input "Peserta" jadi `type="number"` agar bisa memfilter.

## 7. Keterbatasan & rekomendasi

1. **Bahasa Inggris tidak punya URL sendiri.** Toggle EN hanya mengganti teks di browser, sehingga Google hanya mengindeks versi Indonesia dan tag `hreflang` tidak bisa dipasang. Kalau EN ingin dirangking, bangun route `/en/expeditions` dengan metadata dan hreflang `id`/`en`/`x-default` sendiri (butuh keputusan produk — pola yang sama berlaku untuk homepage).
2. **Harga** pada kartu/schema adalah contoh "mulai dari", bukan harga final. Pastikan klien setuju sebelum `Offer` dipublikasikan.
3. Dua kartu ekspedisi belum punya halaman detail sendiri (lihat README #4). Setelah ada, tiap detail butuh title, meta, H1, dan schema sendiri.
4. Foto hero list diambil dari `youth-gallery` (program Youth). Cek izin pemakaian foto anak/peserta sekolah dengan klien.
5. Belum ada data rating/review — jangan tambahkan `AggregateRating` sebelum ada ulasan asli.

## 8. Token brand

- List page: ink `oklch(20% .02 250)`, ocean `oklch(49% .19 258)`, ocean deep `oklch(28% .13 260)`, lime `oklch(88% .18 112)`, coral `oklch(67% .17 32)`; font display Space Grotesk, body DM Sans.
- Detail page: ink `#171717`, sea `#075be8`, sea deep `#15357e`, sun/lime `#c9f341`; font display Fredoka, body DM Sans.
- Kedua halaman mengikuti prototipe HTML apa adanya, jadi font display berbeda antar halaman (Space Grotesk vs Fredoka). Jika ingin satu sistem, samakan ke token homepage (Fredoka, `#0057ff`, `#0a2776`, `#c9f341`) — perubahan ada di `styles/expeditions.css`.
