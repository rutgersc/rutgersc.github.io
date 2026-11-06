import type { VideoProgress } from './video-utils.js';
export interface PodcastEpisode {
    pageUrl: string;
    audioUrl: string;
    title: string;
    show: string;
}
export interface PodcastHistoryEntry {
    kind: 'podcast';
    episode: PodcastEpisode;
    dateViewed: string;
    wasWatchLater?: boolean;
    progress?: VideoProgress;
}
export declare const CURRENT_PODCAST_KEY = "current-podcast";
export declare function isPodcastUrl(input: string): boolean;
export declare function parsePodcastHistoryEntry(entry: Record<string, unknown>): PodcastHistoryEntry | null;
export declare function resolveEpisode(pageUrl: string): Promise<PodcastEpisode>;
export interface PodcastPlaybackHooks {
    startAt: number;
    onProgress: (progress: VideoProgress) => void;
}
export declare function currentPodcastAudio(): HTMLAudioElement | null;
export declare function hidePodcast(): void;
export declare function showPodcast(pageUrl: string, hooks: (episode: PodcastEpisode) => PodcastPlaybackHooks): Promise<PodcastEpisode | null>;
export declare function renderPodcastItem(entry: PodcastHistoryEntry, onPlay: () => void, onRemove?: () => void): HTMLLIElement;
