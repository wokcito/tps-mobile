import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TodoScreen from '../src/screens/TodoScreen';
import { STORAGE_KEY } from '../src/todos';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('TodoScreen', () => {
  it('restaura las tareas desde AsyncStorage al iniciar', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: '1', title: 'guardada', completed: true }]),
    );
    await render(<TodoScreen />);
    expect(await screen.findByText(/guardada/)).toBeTruthy();
    expect(screen.getByTestId('todo-summary').props.children.join('')).toContain('1 completadas');
  });

  it('no agrega tareas vacías, agrega, persiste y elimina con long press', async () => {
    await render(<TodoScreen />);
    await fireEvent.press(screen.getByTestId('todo-add'));
    expect(screen.queryByText(/○/)).toBeNull();

    await fireEvent.changeText(screen.getByTestId('todo-input'), '  comprar pan ');
    await fireEvent.press(screen.getByTestId('todo-add'));
    expect(screen.getByText(/comprar pan/)).toBeTruthy();
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string)).toHaveLength(1);
    });

    await fireEvent(screen.getByText(/comprar pan/), 'longPress');
    expect(screen.queryByText(/comprar pan/)).toBeNull();
  });

  it('el filtro cambia el listado sin perder estado', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', title: 'hecha', completed: true },
        { id: '2', title: 'pendiente', completed: false },
      ]),
    );
    await render(<TodoScreen />);
    await screen.findByText(/hecha/);
    await fireEvent.press(screen.getByTestId('filter-active'));
    expect(screen.queryByText(/hecha/)).toBeNull();
    expect(screen.getByText(/pendiente/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-all'));
    expect(screen.getByText(/hecha/)).toBeTruthy();
  });
});
