import type { VideoData, VideoProgress } from './video-utils.js';
import type { CompactedHistory } from './history.js';
export interface RenderOptions {
    onRemove?: ((videoId: string) => void) | null;
    removeButtonText?: string;
    removeButtonTitle?: string;
    onPlay?: ((videoId: string) => void) | null;
    wasWatchLater?: boolean;
    playUrl?: string | null;
    onCompact?: (() => void) | null;
    showCompactButton?: boolean;
    progress?: VideoProgress | null;
}
export declare function renderVideoItem(videoData: VideoData, dateViewed: string | null, options?: RenderOptions): HTMLLIElement;
export declare function renderCompactedSection(compacted: CompactedHistory): HTMLDivElement;
export declare function initViewportManager(): void;
