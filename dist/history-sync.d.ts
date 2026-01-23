export declare let historyTaskId: string | null;
export declare let historyListId: string | null;
export declare function isHistorySyncEnabled(): boolean;
export declare function initHistorySync(): Promise<void>;
export declare function scheduleSyncToTodo(): void;
export declare function syncHistoryToTodo(): Promise<void>;
export declare function syncHistoryNow(): void;
export declare function isHistorySyncReady(): boolean;
