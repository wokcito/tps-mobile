import { fireEvent, render } from '@testing-library/react-native';
import CounterScreen, { MAX_COUNT } from '../src/screens/CounterScreen';

describe('CounterScreen', () => {
  it('empieza en 0, incrementa de a uno y resetea', async () => {
    const { getByTestId } = await render(<CounterScreen />);
    expect(getByTestId('counter-value').props.children).toBe(0);
    await fireEvent.press(getByTestId('btn-increment'));
    await fireEvent.press(getByTestId('btn-increment'));
    expect(getByTestId('counter-value').props.children).toBe(2);
    await fireEvent.press(getByTestId('btn-reset'));
    expect(getByTestId('counter-value').props.children).toBe(0);
  });

  it('el toggle de tema cambia el color de fondo', async () => {
    const { getByTestId, toJSON } = await render(<CounterScreen />);
    const bg = () => JSON.stringify(toJSON()).match(/"backgroundColor":"(#[0-9A-F]+)"/i)?.[1];
    const before = bg();
    await fireEvent.press(getByTestId('btn-theme'));
    expect(bg()).not.toBe(before);
  });

  it('deshabilita +1 al llegar al máximo y muestra aviso', async () => {
    const { getByTestId, getByText } = await render(<CounterScreen />);
    for (let i = 0; i < MAX_COUNT + 3; i++) await fireEvent.press(getByTestId('btn-increment'));
    expect(getByTestId('counter-value').props.children).toBe(MAX_COUNT);
    expect(getByText(/Llegaste al máximo/)).toBeTruthy();
  });
});
