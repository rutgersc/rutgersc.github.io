import type { TodoList, TodoTask } from './types.js';
export declare function callGraphApi<T = unknown>(endpoint: string, method?: string, body?: unknown): Promise<T>;
export declare function getAppStateTodoList(): Promise<TodoList>;
export declare function getAppStateTasks(listId: string): Promise<TodoTask[]>;
export declare function createAppStateTask(listId: string, title: string, body?: string): Promise<TodoTask>;
export declare function updateAppStateTask(listId: string, taskId: string, title: string, body: string): Promise<TodoTask>;
