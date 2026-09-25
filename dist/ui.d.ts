import type { VideoData, VideoProgress, ChannelVideo } from './video-utils.js';
import type { ChannelGroup } from './history.js';
export interface RenderOptions {
    onRemove?: ((videoId: string) => void) | null;
    removeButtonText?: string;
    removeButtonTitle?: string;
    onPlay?: ((videoId: string) => void) | null;
    wasWatchLater?: boolean;
    playUrl?: string | null;
    onFix?: (() => void) | null;
    progress?: VideoProgress | null;
}
export declare function renderXItem(postId: string, dateViewed: string | null, onRemove?: () => void): HTMLLIElement;
export declare const SHORTS_MAX_SECONDS: number;
export declare const renderChannelVideoItem: (video: ChannelVideo, watchedIndex: Map<string, {
    dateViewed: string;
}>) => HTMLDivElement;
export declare function renderVideoItem(videoData: VideoData, dateViewed: string | null, options?: RenderOptions): HTMLLIElement;
export declare function renderChannelGroups(channels: ChannelGroup[]): HTMLDivElement;
export declare function initViewportManager(): void;
