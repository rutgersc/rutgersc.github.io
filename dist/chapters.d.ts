export interface Chapter {
    readonly title: string;
    readonly startSeconds: number;
}
export declare const fetchChapters: (videoId: string) => Promise<readonly Chapter[]>;
export declare const renderChapters: (chapters: readonly Chapter[], onSeek: (seconds: number) => void) => void;
export declare const highlightCurrentChapter: (chapters: readonly Chapter[], currentTime: number) => void;
