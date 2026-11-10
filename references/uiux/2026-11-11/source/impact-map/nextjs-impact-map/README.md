# Terumbu.eco — Impact Map Package (Next.js)

Next.js (App Router, `output: 'export'`) untuk halaman **`/impact-map`** (Peta Dampak / menu "Jejak Dampak").

| Route | File | Sumber desain |
|---|---|---|
| `/impact-map` | `app/impact-map/page.tsx` → `components/ImpactMapView.tsx` + `components/ImpactExplorer.tsx` | `impact-map-revamp-v3.html` |

Stack sama dengan paket homepage & expeditions: Next 16.4.2, React 19.2, TypeScript. Satu dependensi tambahan: **Leaflet 1.9.4** (peta, tile OpenStreetMap).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000/impact-map
npm run build    # static export ke ./out
npx serve out    # preview hasil export (jangan buka lewat file://)
```

## Struktur

```
app/impact-map/page.tsx   metadata SEO (title, description, canonical, OG, Twitter) + JSON-LD
app/sitemap.ts, robots.ts
components/ImpactMapView.tsx   seluruh section halaman
components/ImpactExplorer.tsx  peta Leaflet + filter + daftar lokasi + kartu detail (client)
components/SiteChrome.tsx      header/footer/skip link (sama dengan paket expeditions)
content/impact-map.ts          SEMUA copy ID + EN, data lokasi (SITES), statistik
lib/i18n.tsx                   toggle ID/EN + mata uang IDR/USD/JPY/EUR (kurs live + fallback)
styles/impact-map.css          CSS dari prototipe, di-scope ke .pg-impact
public/assets/                 logo + foto hero (1600 px)
```

## Catatan penting untuk engineer

1. **Data masih statis.** `SITES` dan `stats` di `content/impact-map.ts` mengikuti halaman live (10 Nov 2026): 3 lokasi, 2 terverifikasi, 1 dalam review, 420 kg sampah. Ganti dengan `getImpactMapSites()` / `getImpactStats()` dari repo platform. Stat rail sengaja hanya memuat angka yang sudah ada di halaman live. Jangan menambah angka tanam karang/mangrove atau dana terkumpul tanpa sumber terverifikasi.
2. **Link "Buka catatan sumber"** (`/campaigns/cleanup-komodo-coast`, `/campaigns/mangrove-shield-bali`, `/campaigns/restore-raja-ampat-reefs`) berasal dari draft; pastikan sesuai route di platform. Idealnya menaut ke catatan aktivitas masing-masing (`evidence.sourceHref`).
3. **Koordinat pin dibulatkan** (perkiraan) supaya kawasan sensitif aman. Jangan ganti dengan koordinat presisi.
4. **Peta.** Leaflet dimuat dinamis di client; HTML server tetap berisi filter, daftar lokasi, dan kartu detail (jadi bisa dibaca crawler dan jadi fallback saat peta gagal). Tile OSM butuh internet; untuk trafik besar pertimbangkan penyedia tile berbayar sesuai kebijakan penggunaan OSM.
5. **Dua istilah.** "Level verifikasi proyek" (Basic/Document/Field verified) berbeda dari "status catatan aktivitas" (terverifikasi/ditinjau). Arti tiga level ditulis berdasarkan nama levelnya, mohon dicek ke tim produk sebelum publish.
6. **Bahasa & mata uang.** HTML statis selalu Bahasa Indonesia + IDR (yang dibaca Google). Toggle EN/kurs bekerja di client, preferensi di `localStorage` (`terumbu-locale`, `terumbu-currency`) dan dibagi antar halaman. Halaman ini belum punya nominal uang, jadi toggle mata uang di header belum mengubah apa pun di sini; akan terpakai jika stat "Terkumpul" ditambahkan dari data donasi.
7. **Domain canonical.** Default `https://terumbu.world`; ubah via env `NEXT_PUBLIC_SITE_URL` atau `lib/site.ts`.
8. **Link header/footer.** `Jejak Dampak` → `/impact-map`; CTA header → `/expeditions`; `Dukung Kampanye` / `Terumbu Academy` masih ke anchor homepage (`/#campaigns`, `/#academy`); kolom "Tentang Kami" ke `/#contact` (placeholder, sama dengan paket expeditions).
9. **Gabung ke app homepage.** Salin `app/impact-map`, `components/Impact*`, `content/impact-map.ts`, `styles/impact-map.css`, `public/assets/impact`, dan tambahkan `leaflet` + `@types/leaflet`. Gabungkan `sitemap.ts`/`robots.ts` dan layout (jangan menimpa). `app/page.tsx` di paket ini hanya placeholder.
10. **Foto hero** diambil dari galeri program Youth. Cek izin pemakaian foto peserta dengan klien.

## Validasi terakhir (10 Nov 2026)

- `npm run build` berhasil; TypeScript lolos; 5 route statis dihasilkan.
- Dicek di browser lewat static export: desktop 1280 px dan mobile 375 px, tanpa horizontal scroll; urutan mobile filter → peta → daftar.
- Filter jenis/status memperbarui daftar, pin, dan kartu detail; toggle ID→EN mengganti teks, `<title>`, dan meta description; tidak ada error console.
- Belum dilakukan: audit Lighthouse/axe, uji lintas browser selain Chromium, uji kontras otomatis, uji dengan data DB asli.
