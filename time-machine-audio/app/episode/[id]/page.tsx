import { notFound } from 'next/navigation';
import { getEpisode } from '@/lib/db';
import { ImmersivePlayer } from '@/components/ImmersivePlayer';
import { GenerationProgress } from '@/components/GenerationProgress';
import type { Metadata } from 'next';

interface EpisodePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id } = await params;
  const episode = await getEpisode(id);
  if (!episode) return { title: 'Episode Not Found' };
  return {
    title: episode.title ? `${episode.title} — Time Machine Audio` : 'Loading Episode...',
    description: episode.share_tagline ?? episode.subtitle ?? undefined,
    openGraph: {
      images: episode.cover_art_url ? [{ url: episode.cover_art_url }] : [],
    },
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) notFound();

  if (episode.status === 'ready' && episode.audio_url && episode.script) {
    return <ImmersivePlayer episode={episode} />;
  }

  return <GenerationProgress episodeId={id} initialEpisode={episode} />;
}
