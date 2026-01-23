import { msalAcquireGraphToken } from './auth.js';

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

export async function callGraphApi<T = unknown>(
  endpoint: string,
  method: string = 'GET',
  body: unknown = null
): Promise<T> {
  try {
    const token = await msalAcquireGraphToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const options: RequestInit = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }
    return await response.json() as T;
  } catch (e) {
    console.error('callGraphApi error:', e);
    throw e;
  }
}

export async function getAppStateTodoList(): Promise<TodoList> {
  try {
    console.log('Fetching todo lists...');
    const lists = await callGraphApi<GraphApiResponse<TodoList>>('/me/todo/lists');
    console.log('All todo lists:', lists);

    const appStateList = lists.value.find(list => list.displayName.toLowerCase() === 'appstate');

    if (appStateList) {
      console.log('Found appstate list:', appStateList);
      return appStateList;
    } else {
      console.log('appstate list not found, creating it...');
      const newList = await callGraphApi<TodoList>('/me/todo/lists', 'POST', {
        displayName: 'appstate'
      });
      console.log('Created appstate list:', newList);
      return newList;
    }
  } catch (e) {
    console.error('getAppStateTodoList error:', e);
    throw e;
  }
}

export async function getAppStateTasks(listId: string): Promise<TodoTask[]> {
  try {
    console.log('Fetching tasks from appstate list...');
    const tasks = await callGraphApi<GraphApiResponse<TodoTask>>(`/me/todo/lists/${listId}/tasks`);
    console.log('appstate tasks:', tasks);
    return tasks.value;
  } catch (e) {
    console.error('getAppStateTasks error:', e);
    throw e;
  }
}

export async function createAppStateTask(listId: string, title: string, body: string = ''): Promise<TodoTask> {
  try {
    const task = await callGraphApi<TodoTask>(`/me/todo/lists/${listId}/tasks`, 'POST', {
      title: title,
      body: {
        content: body,
        contentType: 'text'
      }
    });
    console.log('Created task:', task);
    return task;
  } catch (e) {
    console.error('createAppStateTask error:', e);
    throw e;
  }
}

export async function updateAppStateTask(listId: string, taskId: string, title: string, body: string): Promise<TodoTask> {
  try {
    const task = await callGraphApi<TodoTask>(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
      title: title,
      body: {
        content: body,
        contentType: 'text'
      }
    });
    console.log('Updated task:', task);
    return task;
  } catch (e) {
    console.error('updateAppStateTask error:', e);
    throw e;
  }
}
