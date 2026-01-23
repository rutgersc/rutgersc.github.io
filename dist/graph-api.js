import { msalAcquireGraphToken } from './auth.js';
export async function callGraphApi(endpoint, method = 'GET', body = null) {
    try {
        const token = await msalAcquireGraphToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        const options = {
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
        return await response.json();
    }
    catch (e) {
        console.error('callGraphApi error:', e);
        throw e;
    }
}
export async function getAppStateTodoList() {
    try {
        console.log('Fetching todo lists...');
        const lists = await callGraphApi('/me/todo/lists');
        console.log('All todo lists:', lists);
        const appStateList = lists.value.find(list => list.displayName.toLowerCase() === 'appstate');
        if (appStateList) {
            console.log('Found appstate list:', appStateList);
            return appStateList;
        }
        else {
            console.log('appstate list not found, creating it...');
            const newList = await callGraphApi('/me/todo/lists', 'POST', {
                displayName: 'appstate'
            });
            console.log('Created appstate list:', newList);
            return newList;
        }
    }
    catch (e) {
        console.error('getAppStateTodoList error:', e);
        throw e;
    }
}
export async function getAppStateTasks(listId) {
    try {
        console.log('Fetching tasks from appstate list...');
        const tasks = await callGraphApi(`/me/todo/lists/${listId}/tasks`);
        console.log('appstate tasks:', tasks);
        return tasks.value;
    }
    catch (e) {
        console.error('getAppStateTasks error:', e);
        throw e;
    }
}
export async function createAppStateTask(listId, title, body = '') {
    try {
        const task = await callGraphApi(`/me/todo/lists/${listId}/tasks`, 'POST', {
            title: title,
            body: {
                content: body,
                contentType: 'text'
            }
        });
        console.log('Created task:', task);
        return task;
    }
    catch (e) {
        console.error('createAppStateTask error:', e);
        throw e;
    }
}
export async function updateAppStateTask(listId, taskId, title, body) {
    try {
        const task = await callGraphApi(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
            title: title,
            body: {
                content: body,
                contentType: 'text'
            }
        });
        console.log('Updated task:', task);
        return task;
    }
    catch (e) {
        console.error('updateAppStateTask error:', e);
        throw e;
    }
}
