import type { HistoryEntry, ChannelGroup } from './history.js';
export declare const channelKey: (g: Pick<ChannelGroup, "author" | "author_url">) => string;
export declare function getIgnoredChannels(): ReadonlySet<string>;
export declare function setChannelIgnored(key: string, ignored: boolean): void;
export declare function renderFeed(history: HistoryEntry[]): HTMLDivElement;
