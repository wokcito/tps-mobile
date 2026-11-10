import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';

describe('flujo de checkout', () => {
  it('permite elegir color, talle y cantidad y elimina productos', async () => {
    await render(<App />);
    expect(await screen.findByTestId('item-p1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('qty-plus-p1'));
    expect(screen.getByTestId('qty-p1').props.children).toBe(2);
    await fireEvent.press(screen.getByTestId('qty-minus-p1'));
    await fireEvent.press(screen.getByTestId('qty-minus-p1'));
    expect(screen.getByTestId('qty-p1').props.children).toBe(1);

    await fireEvent.press(screen.getByTestId('color-p1-Rojo'));
    expect(screen.getByText('Color: Rojo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('size-p1-42'));
    expect(screen.getByText('Talle: 42')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('remove-p2'));
    expect(screen.queryByTestId('item-p2')).toBeNull();
  });

  it('recorre carrito, envío y pago con las tres opciones de tarjeta', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('go-checkout'));

    // validación de envío
    await fireEvent.press(await screen.findByTestId('go-payment'));
    expect(screen.getByText('Ingresá tu nombre completo')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('ship-name'), 'Juan Perez');
    await fireEvent.changeText(screen.getByTestId('ship-address'), 'Calle Falsa 123');
    await fireEvent.changeText(screen.getByTestId('ship-city'), 'Concordia');
    await fireEvent.changeText(screen.getByTestId('ship-zip'), '3200');
    await fireEvent.press(screen.getByTestId('go-payment'));

    expect(await screen.findByTestId('card-type-visa')).toBeTruthy();
    expect(screen.getByTestId('card-type-mastercard')).toBeTruthy();
    expect(screen.getByTestId('card-type-other')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('card-type-mastercard'));
    await fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
    await fireEvent.changeText(screen.getByTestId('card-holder'), 'JUAN PEREZ');
    await fireEvent.changeText(screen.getByTestId('card-expiry'), '1230');
    await fireEvent.changeText(screen.getByTestId('card-cvv'), '123');
    await fireEvent.press(screen.getByTestId('pay'));
    expect(screen.getByText(/no corresponde a una tarjeta Master/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('card-type-visa'));
    await fireEvent.press(screen.getByTestId('pay'));
    expect(await screen.findByText('¡Pago exitoso!')).toBeTruthy();
    expect(screen.getByText(/terminada en 1111/)).toBeTruthy();
  });
});
