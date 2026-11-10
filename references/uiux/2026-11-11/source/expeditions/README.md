# Terumbu.eco — Expeditions Package (Next.js)

Next.js (App Router, `output: 'export'`) untuk dua halaman:

| Route | File | Sumber desain |
|---|---|---|
| `/expeditions` | `app/expeditions/page.tsx` → `components/ExpeditionsView.tsx` | `expeditions.html` |
| `/expeditions/pulau-pramuka` | `app/expeditions/[slug]/page.tsx` → `components/ExpeditionDetailView.tsx` | `expedition-detail.html` |

Stack sama dengan paket homepage: Next 16.4.2, React 19.2, TypeScript, tanpa library tambahan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000/expeditions
npm run build    # static export ke ./out
npx serve out    # preview hasil export (jangan buka lewat file://)
```

## Struktur

```
app/                 route, metadata (SEO), JSON-LD, sitemap.ts, robots.ts
components/          SiteChrome (header/footer/skip link), ExpeditionsView, ExpeditionDetailView
content/             semua copy ID + EN (satu tempat), data ekspedisi
lib/i18n.tsx         toggle bahasa ID/EN + mata uang IDR/USD/JPY/EUR (kurs live + fallback)
lib/bilingual.ts    helper T() / tipe L — aman dipakai di server & client
lib/site.ts          SITE_URL, nomor WhatsApp
styles/              CSS dari prototipe HTML, di-scope ke .pg-list / .pg-detail
public/assets/       logo + foto ekspedisi
```

## Catatan penting untuk engineer

1. **Bahasa & mata uang.** HTML statis selalu dirender Bahasa Indonesia + IDR (ini yang dibaca Google). Toggle EN/kurs bekerja di client, preferensi disimpan di `localStorage` dan dibagi antar halaman. Sama dengan pola paket homepage. Lihat `seo/SEO-Handoff.md` bagian "Keterbatasan" untuk rekomendasi route `/en`.
2. **Domain canonical.** Default `https://terumbu.world` (sama dengan homepage). Ganti lewat env `NEXT_PUBLIC_SITE_URL` atau `lib/site.ts`. Prototipe detail awalnya memakai `terumbu.eco/expeditions/pulau-pramuka/` — mohon konfirmasi domain final ke tim.
3. **Trailing slash.** Tidak dipakai (`/expeditions`, bukan `/expeditions/`), konsisten dengan `next.config.mjs` homepage.
4. **Detail page.** Baru Pulau Pramuka yang punya halaman detail. Dua kartu lain ("Sehari bersama penjaga mangrove", "Kenalan dengan terumbu") sementara menaut ke detail Pramuka, sama seperti prototipe. Menambah detail baru: tambah file di `content/`, ubah `hasOwnDetailPage: true` di `content/expeditions.ts`, dan daftarkan slug di `generateStaticParams` + `sitemap.ts`.
5. **Filter.** Search, destinasi, jumlah peserta, dan sort sudah berfungsi (client-side, dari `content/expeditions.ts`). Filter tanggal Keberangkatan/Kepulangan baru UI — butuh data jadwal dari backend. Sort "Durasi" memakai `durationDays`; kartu terumbu belum punya durasi dari klien jadi diurutkan terakhir.
6. **Link placeholder.** Kolom footer "Tentang Kami" (Gabung Terumbu, Bisnis & Korporasi, Mitra Kami, Kebijakan Privasi) menaut ke `/#contact`. "Dukung Kampanye", "Jejak Dampak", "Terumbu Academy" menaut ke anchor homepage (`/#campaigns`, `/#impact`, `/#academy`) — pastikan anchor itu ada saat digabung.
7. **Nomor WhatsApp** (`lib/site.ts`) harus dikonfirmasi klien sebelum publish.
8. **Gabung ke app homepage.** Salin `app/expeditions`, `components`, `content`, `lib`, `styles`, dan `public/assets/expeditions` + `terumbu-logo.png`. `app/layout.tsx` di sini hanya membungkus `PrefsProvider` dan memuat font; gabungkan dengan layout homepage, dan gabungkan `sitemap.ts`/`robots.ts` (jangan menimpa). `app/page.tsx` di paket ini hanya placeholder.
9. **Harga** (Rp750.000 / 425.000 / 575.000) adalah contoh harga mulai dari prototipe, bukan harga final.

## Validasi terakhir (10 Nov 2026)

- `npm run build` berhasil; TypeScript lolos; 7 halaman statis dihasilkan.
- Dicek di browser lewat static export: desktop 1280 px dan mobile 390 px — tanpa horizontal scroll, filter tampil sebelum sort di mobile.
- Toggle ID→EN mengganti seluruh teks, `<title>`, meta description, dan `lang`; toggle kurs memformat ulang semua harga dan tersimpan antar halaman.
- Filter jumlah peserta + empty state berfungsi; 15 FAQ list dan 4 FAQ detail tampil; galeri hero detail berotasi.
- Belum dilakukan: audit Lighthouse/axe, uji lintas browser selain Chromium, uji kontras otomatis.
