# Terumbu.eco Homepage — Client Package

Paket ini berisi homepage terbaru dengan bahasa Indonesia sebagai default, opsi bahasa Inggris, mata uang IDR/USD/JPY/EUR, SEO metadata, dan static export HTML.

## Isi paket

- `nextjs-homepage/` — source Next.js dan aset publik.
- `html/` — hasil `next build` dengan `output: export`; buka melalui web server statis.
- `seo/SEO-Handoff.md` — title, meta description, H1, alt text, locale, currency, dan token brand.

## Menjalankan source Next.js

```bash
cd nextjs-homepage
npm install
npm run dev
```

## Menjalankan HTML export

```bash
npx serve html
```

HTML export menggunakan path root (`/_next` dan `/assets`), jadi jalankan melalui web server statis, bukan `file://` langsung.

## Validasi terakhir

- `npm run build` berhasil.
- Static export tersedia di `html/index.html`.
- Footer sudah tidak memuat kolom Kepercayaan, teks `Terumbu.eco`, atau indikator `ID · IDR` di bagian bawah.
- Default halaman: Bahasa Indonesia dan IDR.
- H1, metadata, JSON-LD Organization, alt text, dan aria-label peta tersedia.
