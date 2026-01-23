declare global {
    const YT: {
        Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
        PlayerState: {
            UNSTARTED: -1;
            ENDED: 0;
            PLAYING: 1;
            PAUSED: 2;
            BUFFERING: 3;
            CUED: 5;
        };
    };
    interface YTPlayerConfig {
        height?: string | number;
        width?: string | number;
        videoId?: string;
        playerVars?: YTPlayerVars;
        events?: {
            onReady?: (event: YTPlayerEvent) => void;
            onStateChange?: (event: YTStateChangeEvent) => void;
            onError?: (event: YTErrorEvent) => void;
        };
    }
    interface YTPlayerVars {
        autoplay?: 0 | 1;
        controls?: 0 | 1 | 2;
        start?: number;
        end?: number;
        loop?: 0 | 1;
        modestbranding?: 0 | 1;
        rel?: 0 | 1;
    }
    interface YTPlayer {
        loadVideoById(videoId: string, startSeconds?: number): void;
        cueVideoById(videoId: string, startSeconds?: number): void;
        playVideo(): void;
        pauseVideo(): void;
        stopVideo(): void;
        seekTo(seconds: number, allowSeekAhead?: boolean): void;
        getVideoUrl(): string;
        getVideoData(): YTVideoData;
        getCurrentTime(): number;
        getDuration(): number;
        getPlayerState(): number;
        getVolume(): number;
        setVolume(volume: number): void;
        mute(): void;
        unMute(): void;
        isMuted(): boolean;
        destroy(): void;
    }
    interface YTVideoData {
        video_id: string;
        title: string;
        author: string;
    }
    interface YTPlayerEvent {
        target: YTPlayer;
    }
    interface YTStateChangeEvent extends YTPlayerEvent {
        data: number;
    }
    interface YTErrorEvent extends YTPlayerEvent {
        data: number;
    }
    function onYouTubePlayerAPIReady(): void;
    interface Window {
        onYouTubePlayerAPIReady: typeof onYouTubePlayerAPIReady;
        aaaplayer: YTPlayer;
    }
}
export declare let player: YTPlayer | undefined;
export declare function initializePlayer(): void;
export declare function apply_vid(vid: string): Promise<void>;
export declare function apply_input_vid(str: string): void;
export declare function select_input_vid(): void;
export declare function apply_input_vid_from_button(): void;
