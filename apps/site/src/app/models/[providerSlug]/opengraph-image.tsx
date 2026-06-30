import { ImageResponse } from 'next/og';
import { getProviderBySlug, getProviderModels } from '@1router/models';

export const alt = 'AI model provider on 1Router';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function ProviderOG({
  params,
}: {
  params: Promise<{ providerSlug: string }>;
}) {
  const { providerSlug } = await params;
  const provider = getProviderBySlug(providerSlug);
  const providerModels = getProviderModels(providerSlug);

  if (!provider) {
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
          Provider not found — 1Router
        </div>
      ),
      { ...size }
    );
  }

  const freeCount = providerModels.filter((m) => m.freeEndpoint).length;
  const downloadableCount = providerModels.filter((m) => m.downloadable).length;
  const seriesDisplay = provider.series.slice(0, 5).join('  ·  ');

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
        {/* Top: Brand */}
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
            1Router / Providers
          </div>
        </div>

        {/* Middle: Provider name + series */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '72px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
            {provider.name}
          </div>
          <div style={{ fontSize: '24px', color: '#a5a5b5', display: 'flex' }}>
            {seriesDisplay}
          </div>
        </div>

        {/* Bottom: Stats */}
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#818cf8' }}>
              {provider.modelCount}
            </div>
            <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Models</div>
          </div>
          {freeCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#a78bfa' }}>
                {freeCount}
              </div>
              <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Free Endpoints</div>
            </div>
          )}
          {downloadableCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#34d399' }}>
                {downloadableCount}
              </div>
              <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Downloadable</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
