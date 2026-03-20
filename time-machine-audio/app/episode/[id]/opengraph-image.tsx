import { ImageResponse } from 'next/og';
import { getEpisode } from '@/lib/db';

export const alt = 'Time Machine Audio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getEpisode(id);

  const title = episode?.title ?? 'Time Machine Audio';
  const subtitle = episode?.share_tagline ?? episode?.subtitle ?? 'History you don\'t just hear. History you live.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070d1f',
          position: 'relative',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,177,72,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Cover art background (if available) */}
        {episode?.cover_art_url && (
          <img
            src={episode.cover_art_url}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.25,
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#ffb148',
              lineHeight: 1.1,
              marginBottom: 16,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 24,
              color: '#a5aac2',
              fontStyle: 'italic',
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              fontSize: 14,
              color: '#6f758b',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginTop: 40,
            }}
          >
            TIME MACHINE AUDIO
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
