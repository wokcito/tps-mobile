import {
  CardForm,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhn,
  validateCard,
} from '../src/payment';

const NOW = new Date(2026, 5, 15);
const valid: CardForm = {
  type: 'visa',
  number: '4111 1111 1111 1111',
  holder: 'Juan Perez',
  expiry: '12/30',
  cvv: '123',
};

describe('tarjetas', () => {
  it('detecta la marca por prefijo', () => {
    expect(detectBrand('4111111111111111')).toBe('visa');
    expect(detectBrand('5555555555554444')).toBe('mastercard');
    expect(detectBrand('2223003122003222')).toBe('mastercard');
    expect(detectBrand('378282246310005')).toBe('other');
  });

  it('valida Luhn', () => {
    expect(luhn('4111111111111111')).toBe(true);
    expect(luhn('4111111111111112')).toBe(false);
    expect(luhn('123')).toBe(false);
  });

  it('formatea número y vencimiento', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatExpiry('1230')).toBe('12/30');
    expect(formatExpiry('1')).toBe('1');
  });

  it('valida el vencimiento', () => {
    expect(isExpiryValid('06/26', NOW)).toBe(true);
    expect(isExpiryValid('05/26', NOW)).toBe(false);
    expect(isExpiryValid('13/30', NOW)).toBe(false);
    expect(isExpiryValid('1230', NOW)).toBe(false);
  });

  it('acepta Visa, Master y Otras con datos correctos', () => {
    expect(validateCard(valid, NOW)).toEqual({});
    expect(
      validateCard({ ...valid, type: 'mastercard', number: '5555 5555 5555 4444' }, NOW),
    ).toEqual({});
    expect(
      validateCard({ ...valid, type: 'other', number: '3782 822463 10005', cvv: '1234' }, NOW),
    ).toEqual({});
  });

  it('rechaza un número que no corresponde al tipo elegido', () => {
    expect(validateCard({ ...valid, type: 'mastercard' }, NOW).number).toMatch(/Master/);
    expect(validateCard({ ...valid, type: 'other' }, NOW).number).toMatch(/Visa o Master/);
    expect(validateCard({ ...valid, number: '4111 1111 1111 1112' }, NOW).number).toMatch(/inválido/);
  });

  it('exige CVV de 4 dígitos en Amex y 3 en el resto, titular y vencimiento', () => {
    const amex = { ...valid, type: 'other' as const, number: '3782 822463 10005' };
    expect(validateCard({ ...amex, cvv: '123' }, NOW).cvv).toMatch(/4 dígitos/);
    expect(validateCard({ ...valid, cvv: '12' }, NOW).cvv).toMatch(/3 dígitos/);
    expect(validateCard({ ...valid, holder: ' ' }, NOW).holder).toBeDefined();
    expect(validateCard({ ...valid, expiry: '01/20' }, NOW).expiry).toBeDefined();
  });
});
