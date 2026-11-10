export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

export const STORAGE_KEY = '@tp1/todos';

export function addTodo(list: Todo[], text: string, id: string): Todo[] {
  const title = text.trim();
  if (!title) return list;
  return [...list, { id, title, completed: false }];
}

export function toggleTodo(list: Todo[], id: string): Todo[] {
  return list.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
}

export function removeTodo(list: Todo[], id: string): Todo[] {
  return list.filter((t) => t.id !== id);
}

export function renameTodo(list: Todo[], id: string, text: string): Todo[] {
  const title = text.trim();
  if (!title) return list;
  return list.map((t) => (t.id === id ? { ...t, title } : t));
}

export function filterTodos(list: Todo[], filter: Filter): Todo[] {
  if (filter === 'active') return list.filter((t) => !t.completed);
  if (filter === 'completed') return list.filter((t) => t.completed);
  return list;
}

export function countTodos(list: Todo[]) {
  const completed = list.filter((t) => t.completed).length;
  return { total: list.length, completed, active: list.length - completed };
}

/** Restaura la lista guardada; ante datos corruptos devuelve una lista vacía. */
export function parseStored(raw: string | null): Todo[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (t): t is Todo =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.completed === 'boolean',
    );
  } catch {
    return [];
  }
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
