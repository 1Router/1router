import { ImageResponse } from 'next/og';
import { models, providers } from '@1router/models';

export const alt = '1Router — One Interface for All AI Models';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          background: 'linear-gradient(135deg, #0f0e17 0%, #1a1730 50%, #0f0e17 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top: Logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Logo mark */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 800,
              color: 'white',
            }}
          >
            1R
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>1Router</div>
        </div>

        {/* Middle: Hero text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '64px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
            One Interface for{' '}
            <span style={{ color: '#818cf8' }}>all AI models</span>
          </div>
          <div style={{ fontSize: '28px', color: '#a5a5b5', maxWidth: '800px' }}>
            Better prices, better uptime, no subscription. Access every model through a single, OpenAI-compatible API.
          </div>
        </div>

        {/* Bottom: Stats */}
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#818cf8' }}>{models.length}+</div>
            <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Models</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#818cf8' }}>{providers.length}+</div>
            <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Providers</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#818cf8' }}>Self-Hostable</div>
            <div style={{ fontSize: '20px', color: '#a5a5b5' }}>Open Source</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
