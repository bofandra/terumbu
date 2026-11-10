import Link from 'next/link';

// Placeholder root agar paket ini bisa dibuild sendiri. Homepage asli ada di paket homepage Terumbu.
export default function Home() {
  return <main style={{ padding: '4rem 1.5rem', fontFamily: 'sans-serif' }}><p>Terumbu — impact map package preview.</p><ul><li><Link href="/impact-map">/impact-map</Link></li></ul></main>;
}
