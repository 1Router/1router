import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { models, type Model } from '@1router/models';
import { ModelDetailClient } from './model-detail-client';

function getModelBySlug(providerSlug: string, modelSlug: string): Model | undefined {
  return models.find((m) => m.providerSlug === providerSlug && m.id.split('/')[1] === modelSlug);
}

export function generateStaticParams() {
  return models.map((m) => ({
    providerSlug: m.providerSlug,
    modelSlug: m.id.split('/')[1],
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerSlug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { providerSlug, modelSlug } = await params;
  const model = getModelBySlug(providerSlug, modelSlug);
  if (!model) {
    return { title: 'Model Not Found' };
  }

  const title = `${model.name} — ${model.provider}`;
  const description = model.description;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://1router.com';
  const url = `${siteUrl}/models/${model.providerSlug}/${model.id.split('/')[1]}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title: `${model.name} — 1Router`,
      description,
      siteName: '1Router',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${model.name} — 1Router`,
      description,
    },
    keywords: [
      model.name,
      model.provider,
      model.series,
      'AI model',
      'LLM',
      'API',
      ...model.capabilities,
    ],
  };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ providerSlug: string; modelSlug: string }>;
}) {
  const { providerSlug, modelSlug } = await params;
  const model = getModelBySlug(providerSlug, modelSlug);
  if (!model) {
    notFound();
  }
  return <ModelDetailClient model={model} />;
}
