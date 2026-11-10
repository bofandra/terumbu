import Link from 'next/link';

// Placeholder root so this package builds on its own. The real homepage lives in the Terumbu homepage package.
export default function Home() {
  return <main style={{ padding: '4rem 1.5rem', fontFamily: 'sans-serif' }}><p>Terumbu — expeditions package preview.</p><ul><li><Link href="/expeditions">/expeditions</Link></li><li><Link href="/expeditions/pulau-pramuka">/expeditions/pulau-pramuka</Link></li></ul></main>;
}
