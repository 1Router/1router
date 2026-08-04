import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rankings',
  description: 'Explore verified model usage recorded by this 1Router deployment.',
  openGraph: {
    title: 'Model Rankings — 1Router',
    description: 'Explore verified model usage recorded by this 1Router deployment.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Model Rankings — 1Router',
    description: 'Explore verified model usage recorded by this 1Router deployment.',
  },
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
