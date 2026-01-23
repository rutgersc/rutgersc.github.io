import type { ChannelDetails } from './types.js';
export declare function extractYouTubeId(input: string): string | null;
export declare function extractTimestamp(input: string): number | null;
export declare function formatTime(sec: number): string;
export declare function getTimeAgo(date: Date): string;
export declare function resolveChannelDetails(videoId: string): Promise<ChannelDetails>;
