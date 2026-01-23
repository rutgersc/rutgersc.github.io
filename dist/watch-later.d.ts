export declare let watchLaterTaskId: string | null;
export declare let watchLaterListId: string | null;
export declare function initWatchLater(): Promise<void>;
export declare function isVideoInWatchLater(videoId: string): Promise<string | null>;
export declare function removeFromWatchLater(checklistItemId: string, listItemElement: HTMLElement | null): Promise<void>;
export declare function loadWatchLater(): Promise<void>;
