import { ImageResponse } from 'next/og';
import { models } from '@1router/models';

export const alt = 'Model details on 1Router';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function getModelBySlug(providerSlug: string, modelSlug: string) {
  return models.find((m) => m.providerSlug === providerSlug && m.id.split('/')[1] === modelSlug);
}

function formatContext(length: number) {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(length % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(length / 1000)}K`;
}

export default async function ModelOG({
  params,
}: {
  params: Promise<{ providerSlug: string; modelSlug: string }>;
}) {
  const { providerSlug, modelSlug } = await params;
  const model = getModelBySlug(providerSlug, modelSlug);

  if (!model) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f0e17',
            color: 'white',
            fontSize: '48px',
            fontFamily: 'sans-serif',
          }}
        >
          Model not found — 1Router
        </div>
      ),
      { ...size }
    );
  }

  const inputPrice = model.pricing.input === 0 ? 'Free' : `$${model.pricing.input.toFixed(2)}/M`;
  const outputPrice = model.pricing.output === 0 ? 'Free' : `$${model.pricing.output.toFixed(2)}/M`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0e17 0%, #1a1730 50%, #0f0e17 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: Brand + provider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              color: 'white',
            }}
          >
            1R
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#a5a5b5' }}>
            1Router / {model.provider}
          </div>
        </div>

        {/* Middle: Model name + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '56px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
            {model.name}
          </div>
          <div style={{ fontSize: '24px', color: '#a5a5b5', maxWidth: '900px', display: 'flex' }}>
            {model.description.slice(0, 140)}
            {model.description.length > 140 ? '…' : ''}
          </div>
        </div>

        {/* Bottom: Stats */}
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#818cf8' }}>
              {formatContext(model.contextLength)}
            </div>
            <div style={{ fontSize: '18px', color: '#a5a5b5' }}>Context</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#818cf8' }}>
              {inputPrice}
            </div>
            <div style={{ fontSize: '18px', color: '#a5a5b5' }}>Input / 1M</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#818cf8' }}>
              {outputPrice}
            </div>
            <div style={{ fontSize: '18px', color: '#a5a5b5' }}>Output / 1M</div>
          </div>
          {model.freeEndpoint && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#a78bfa' }}>Free</div>
              <div style={{ fontSize: '18px', color: '#a5a5b5' }}>Endpoint</div>
            </div>
          )}
          {model.downloadable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#34d399' }}>Open</div>
              <div style={{ fontSize: '18px', color: '#a5a5b5' }}>Downloadable</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
