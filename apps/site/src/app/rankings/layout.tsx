import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rankings',
  description: 'Real-world AI model usage rankings by tokens consumed through 1Router. See which models are trending across 24h, 7d, 30d, and all-time.',
  openGraph: {
    title: 'Model Rankings — 1Router',
    description: 'Real-world AI model usage rankings by tokens consumed through 1Router.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Model Rankings — 1Router',
    description: 'Real-world AI model usage rankings by tokens consumed through 1Router.',
  },
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
