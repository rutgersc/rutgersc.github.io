import type { VideoData, CompactedHistory, RenderOptions } from './types.js';
export declare function renderVideoItem(videoData: VideoData, dateViewed: string | null, options?: RenderOptions): HTMLLIElement;
export declare function renderCompactedSection(compacted: CompactedHistory): HTMLDivElement;
export declare function initViewportManager(): void;
