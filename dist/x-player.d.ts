interface XWidgets {
    ready(callback: () => void): void;
    widgets: {
        createVideo(postId: string, container: HTMLElement, options: {
            theme: 'dark';
        }): Promise<HTMLElement | null>;
    };
}
declare global {
    interface Window {
        twttr?: XWidgets;
    }
}
export declare function hideXVideo(): void;
export declare function showXVideo(postId: string): Promise<void>;
export {};
