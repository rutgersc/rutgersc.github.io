import type { VideoData, VideoProgress } from './video-utils.js';
export interface YouTubeHistoryEntry {
    kind: 'youtube';
    videoData: VideoData;
    dateViewed: string;
    wasWatchLater?: boolean;
    progress?: VideoProgress;
}
export interface XHistoryEntry {
    kind: 'x';
    postId: string;
    dateViewed: string;
    wasWatchLater?: boolean;
}
export type HistoryEntry = YouTubeHistoryEntry | XHistoryEntry;
export declare const historyKey: (entry: HistoryEntry) => string;
export interface ChannelGroup {
    author: string;
    author_url?: string;
    author_id?: string;
    videos: Array<{
        videoData: VideoData;
        dateViewed: string;
        wasWatchLater?: boolean;
    }>;
}
export interface CompactedHistory {
    compactedAt: string;
    channels: ChannelGroup[];
}
export declare function parseHistoryEntry(value: unknown): HistoryEntry | null;
export declare function getHistory(): HistoryEntry[];
export declare function addToHistory(videoData: VideoData, _name: string, wasWatchLater?: boolean, progress?: VideoProgress | null): void;
export declare function addXToHistory(postId: string, wasWatchLater?: boolean): void;
export declare function updateHistoryProgress(videoId: string, currentTime: number, duration: number): void;
export declare function getHistoryProgress(videoId: string): number;
export type HistoryView = "list" | "grouped";
export declare function getHistoryView(): HistoryView;
export type GroupSort = "count" | "recent";
export declare function getGroupSort(): GroupSort;
export declare function groupByChannel(history: HistoryEntry[], sort?: GroupSort): ChannelGroup[];
export declare function renderHistory(): void;
export declare function clearHistory(): void;
export declare function getWatchedVideosIndex(): Map<string, {
    dateViewed: string;
}>;
export declare function getCompactedHistory(): CompactedHistory | null;
export declare function importCompactedIntoHistory(): void;
export declare function dumpAllEvents(): void;
