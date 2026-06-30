import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with multiple AI models simultaneously. Compare responses from different providers side by side through 1Router.',
  openGraph: {
    title: 'Multi-Model Chatroom — 1Router',
    description: 'Chat with multiple AI models simultaneously. Compare responses side by side.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multi-Model Chatroom — 1Router',
    description: 'Chat with multiple AI models simultaneously. Compare responses side by side.',
  },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
