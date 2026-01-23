export interface VideoData {
    video_id: string;
    title: string;
    author: string;
    author_id?: string;
    author_url?: string;
    timestamp?: number;
}
export interface VideoProgress {
    currentTime: number;
    duration: number;
    percentage: number;
}
interface ChannelDetails {
    author_url: string | null;
}
export declare function extractYouTubeId(input: string): string | null;
export declare function extractTimestamp(input: string): number | null;
export declare function formatTime(sec: number): string;
export declare function getTimeAgo(date: Date): string;
export declare function resolveChannelDetails(videoId: string): Promise<ChannelDetails>;
export {};
