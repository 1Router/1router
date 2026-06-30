import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Models',
  description: 'Browse and compare all AI models available through 1Router. Filter by provider, context length, price, modality, and more.',
  openGraph: {
    title: 'AI Model Catalog — 1Router',
    description: 'Browse and compare all AI models available through 1Router.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Model Catalog — 1Router',
    description: 'Browse and compare all AI models available through 1Router.',
  },
};

export default function ModelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
