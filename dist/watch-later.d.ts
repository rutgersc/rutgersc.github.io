import { VideoRef } from './video-utils.js';
export declare let watchLaterTaskId: string | null;
export declare let watchLaterListId: string | null;
export declare function initWatchLater(): Promise<void>;
export declare function isVideoInWatchLater(ref: VideoRef): Promise<string | null>;
export declare function removeFromWatchLater(checklistItemId: string, listItemElement: HTMLElement | null): Promise<void>;
export declare function loadWatchLater(): Promise<void>;
