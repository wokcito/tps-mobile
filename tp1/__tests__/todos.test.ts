import {
  addTodo,
  countTodos,
  filterTodos,
  parseStored,
  removeTodo,
  renameTodo,
  toggleTodo,
  Todo,
} from '../src/todos';

const base: Todo[] = [
  { id: 'a', title: 'uno', completed: false },
  { id: 'b', title: 'dos', completed: true },
];

describe('todos', () => {
  it('no agrega tareas vacías o de solo espacios', () => {
    expect(addTodo(base, '   ', 'x')).toBe(base);
    expect(addTodo(base, '', 'x')).toBe(base);
  });

  it('agrega con trim y como no completada', () => {
    expect(addTodo([], '  hola ', 'x')).toEqual([{ id: 'x', title: 'hola', completed: false }]);
  });

  it('alterna completada y elimina por id', () => {
    expect(toggleTodo(base, 'a')[0].completed).toBe(true);
    expect(toggleTodo(base, 'b')[1].completed).toBe(false);
    expect(removeTodo(base, 'a')).toEqual([base[1]]);
  });

  it('filtra sin perder las tareas originales', () => {
    expect(filterTodos(base, 'active').map((t) => t.id)).toEqual(['a']);
    expect(filterTodos(base, 'completed').map((t) => t.id)).toEqual(['b']);
    expect(filterTodos(base, 'all')).toHaveLength(2);
    expect(base).toHaveLength(2);
  });

  it('cuenta total y completadas', () => {
    expect(countTodos(base)).toEqual({ total: 2, completed: 1, active: 1 });
  });

  it('renombra con trim y rechaza títulos vacíos', () => {
    expect(renameTodo(base, 'a', ' nuevo ')[0].title).toBe('nuevo');
    expect(renameTodo(base, 'a', '  ')).toBe(base);
  });

  it('restaura desde AsyncStorage y tolera datos corruptos', () => {
    expect(parseStored(JSON.stringify(base))).toEqual(base);
    expect(parseStored(null)).toEqual([]);
    expect(parseStored('{no json')).toEqual([]);
    expect(parseStored('{"a":1}')).toEqual([]);
    expect(parseStored(JSON.stringify([{ id: 1 }, base[0]]))).toEqual([base[0]]);
  });
});
