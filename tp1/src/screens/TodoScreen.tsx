import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import {
  Filter,
  STORAGE_KEY,
  Todo,
  addTodo,
  countTodos,
  filterTodos,
  newId,
  parseStored,
  removeTodo,
  renameTodo,
  toggleTodo,
} from '../todos';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'completed', label: 'Completadas' },
];

const DOUBLE_TAP_MS = 300;

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const lastTap = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setTodos(parseStored(raw)))
      .catch(() => setTodos([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch(() => undefined);
  }, [todos, loaded]);

  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const submit = () => {
    const next = addTodo(todos, text, newId());
    if (next === todos) return;
    animate();
    setTodos(next);
    setText('');
  };

  const onPressItem = useCallback((item: Todo) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === item.id && now - prev.at < DOUBLE_TAP_MS) {
      // doble tap: deshace el toggle del primer tap y abre la edición inline
      lastTap.current = null;
      setTodos((list) => toggleTodo(list, item.id));
      setEditingId(item.id);
      setEditText(item.title);
      return;
    }
    lastTap.current = { id: item.id, at: now };
    animate();
    setTodos((list) => toggleTodo(list, item.id));
  }, []);

  const onLongPressItem = useCallback((item: Todo) => {
    animate();
    setTodos((list) => removeTodo(list, item.id));
  }, []);

  const finishEdit = () => {
    if (editingId) setTodos((list) => renameTodo(list, editingId, editText));
    setEditingId(null);
  };

  const { total, completed } = countTodos(todos);
  const visible = filterTodos(todos, filter);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.summary} testID="todo-summary">
        {total} en total · {completed} completadas
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          testID="todo-input"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Nueva tarea"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Pressable testID="todo-add" style={styles.addButton} onPress={submit}>
          <Text style={styles.addText}>Agregar</Text>
        </Pressable>
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            testID={`filter-${f.key}`}
            onPress={() => setFilter(f.key)}
            style={[styles.filter, filter === f.key && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No hay tareas para mostrar.</Text>}
        renderItem={({ item }) =>
          editingId === item.id ? (
            <TextInput
              style={[styles.item, styles.editInput]}
              value={editText}
              onChangeText={setEditText}
              autoFocus
              onBlur={finishEdit}
              onSubmitEditing={finishEdit}
            />
          ) : (
            <Pressable
              style={styles.item}
              onPress={() => onPressItem(item)}
              onLongPress={() => onLongPressItem(item)}
            >
              <Text style={[styles.itemText, item.completed && styles.itemDone]}>
                {item.completed ? '✓ ' : '○ '}
                {item.title}
              </Text>
            </Pressable>
          )
        }
      />
      <Text style={styles.hint}>
        Tap: completar · Doble tap: editar · Mantené presionado: eliminar
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#F2F4F8' },
  summary: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1B1F2A' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9DEE8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3461FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  filter: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3461FF',
  },
  filterActive: { backgroundColor: '#3461FF' },
  filterText: { color: '#3461FF', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  item: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D9DEE8',
  },
  editInput: { fontSize: 16, borderColor: '#3461FF' },
  itemText: { fontSize: 16, color: '#1B1F2A' },
  itemDone: { textDecorationLine: 'line-through', color: '#8A93A6' },
  empty: { textAlign: 'center', color: '#8A93A6', marginTop: 24 },
  hint: { textAlign: 'center', color: '#8A93A6', fontSize: 12, paddingTop: 8 },
});
