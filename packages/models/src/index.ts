import modelsData from '../models.json';

// Re-export shared site-only helpers so consumers can import everything from
// a single entry point: `import { models, providerColors } from '@1router/models'`.
export { providerColors } from './provider-colors';

// ── Types ──────────────────────────────────────────────

export interface ModelPricing {
  input: number   // $ per 1M tokens (0 = free)
  output: number  // $ per 1M tokens (0 = free)
}

export interface Model {
  id: string
  name: string
  provider: string
  providerSlug: string
  description: string
  contextLength: number
  pricing: ModelPricing
  capabilities: string[]
  modality: string[]
  series: string
  releaseDate?: string
  deprecated?: boolean
  trending?: boolean
  // ── Self-hosted / catalog metadata ──
  downloadable?: boolean
  freeEndpoint?: boolean
  apiCalls30d?: string
  tags?: string[]
  license?: string
}

// ── Canonical model list (from JSON open data format) ──
// models.json is the single source of truth — hand-editable, machine-readable.
// This lightweight runtime check catches malformed entries early.
for (const m of modelsData.models) {
  if (!m.id || !m.name || !m.provider || !m.providerSlug || !m.pricing || !m.contextLength || !m.series) {
    throw new Error(`Invalid model entry in models.json: ${JSON.stringify(m).slice(0, 100)}`);
  }
}

export const models: Model[] = modelsData.models as Model[];

// ── Derived data ───────────────────────────────────────

export const providers = Array.from(
  new Set(models.map((m) => m.provider))
).sort();

export const seriesList = Array.from(
  new Set(models.map((m) => m.series))
).sort();

export const modalityOptions = Array.from(
  new Set(models.flatMap((m) => m.modality))
).sort();

export const capabilityOptions = [
  'text-generation',
  'chat',
  'function-calling',
  'json-mode',
  'vision',
  'code',
  'reasoning',
  'roleplay',
  'web-search',
  'audio',
  'agentic',
  'safety',
  'content-moderation',
  'embeddings',
  'translation',
  'tts',
  'video-generation',
  'multilingual',
  'biology',
  'reranking',
  'retrieval',
];

export const trendingModels = models.filter((m) => m.trending);

export const downloadableModels = models.filter((m) => m.downloadable);
export const freeEndpointModels = models.filter((m) => m.freeEndpoint);

/** Build the URL path for a model's detail page */
export function modelUrl(model: Model): string {
  return `/models/${model.providerSlug}/${model.id.split('/')[1]}`;
}

/** Build the URL path for a provider's overview page */
export function providerUrl(providerSlug: string): string {
  return `/models/${providerSlug}`;
}

/** Get all models for a given provider slug */
export function getProviderModels(providerSlug: string): Model[] {
  return models.filter((m) => m.providerSlug === providerSlug);
}

/** Get provider display info by slug */
export function getProviderBySlug(providerSlug: string): { name: string; slug: string; modelCount: number; series: string[] } | undefined {
  const providerModels = getProviderModels(providerSlug);
  if (providerModels.length === 0) return undefined;
  return {
    name: providerModels[0].provider,
    slug: providerSlug,
    modelCount: providerModels.length,
    series: Array.from(new Set(providerModels.map((m) => m.series))).sort(),
  };
}

/** All unique provider slugs */
export const providerSlugs = Array.from(
  new Set(models.map((m) => m.providerSlug))
).sort();
