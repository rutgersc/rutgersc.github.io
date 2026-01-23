export interface GraphApiResponse<T> {
    value: T[];
    '@odata.context'?: string;
    '@odata.nextLink'?: string;
}
export interface TodoList {
    id: string;
    displayName: string;
    isOwner?: boolean;
    isShared?: boolean;
    wellknownListName?: string;
}
export interface TodoTask {
    id: string;
    title: string;
    body?: {
        content: string;
        contentType: string;
    };
    status?: string;
    importance?: string;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
}
export declare function callGraphApi<T = unknown>(endpoint: string, method?: string, body?: unknown): Promise<T>;
export declare function getAppStateTodoList(): Promise<TodoList>;
export declare function getAppStateTasks(listId: string): Promise<TodoTask[]>;
export declare function createAppStateTask(listId: string, title: string, body?: string): Promise<TodoTask>;
export declare function updateAppStateTask(listId: string, taskId: string, title: string, body: string): Promise<TodoTask>;
