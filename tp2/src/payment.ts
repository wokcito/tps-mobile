export type CardType = 'visa' | 'mastercard' | 'other';

export const CARD_TYPES: { key: CardType; label: string }[] = [
  { key: 'visa', label: 'Visa' },
  { key: 'mastercard', label: 'Master' },
  { key: 'other', label: 'Otras' },
];

export interface CardForm {
  type: CardType;
  number: string;
  holder: string;
  expiry: string; // MM/YY
  cvv: string;
}

export type CardErrors = Partial<Record<'number' | 'holder' | 'expiry' | 'cvv', string>>;

export const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** Marca real según el prefijo; 'other' para Amex, Diners, etc. */
export function detectBrand(number: string): CardType {
  const n = digitsOnly(number);
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(n)) return 'mastercard';
  return 'other';
}

export function luhn(number: string): boolean {
  const n = digitsOnly(number);
  if (n.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isAmex(number: string): boolean {
  return /^3[47]/.test(digitsOnly(number));
}

export function formatCardNumber(number: string): string {
  const n = digitsOnly(number).slice(0, 19);
  if (isAmex(n)) {
    return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ');
  }
  return n.replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiry(value: string): string {
  const d = digitsOnly(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function isExpiryValid(expiry: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
}

export function expectedCvvLength(number: string): number {
  return isAmex(number) ? 4 : 3;
}

export function validateCard(form: CardForm, now: Date = new Date()): CardErrors {
  const errors: CardErrors = {};
  const n = digitsOnly(form.number);
  if (!n) errors.number = 'Ingresá el número de tarjeta';
  else if (!luhn(n)) errors.number = 'Número de tarjeta inválido';
  else if (form.type !== 'other' && detectBrand(n) !== form.type) {
    errors.number = `El número no corresponde a una tarjeta ${form.type === 'visa' ? 'Visa' : 'Master'}`;
  } else if (form.type === 'other' && detectBrand(n) !== 'other') {
    errors.number = 'Para Visa o Master elegí ese tipo de tarjeta';
  }
  if (form.holder.trim().length < 3) errors.holder = 'Ingresá el nombre del titular';
  if (!isExpiryValid(form.expiry, now)) errors.expiry = 'Vencimiento inválido (MM/AA)';
  if (digitsOnly(form.cvv).length !== expectedCvvLength(n)) {
    errors.cvv = `El código debe tener ${expectedCvvLength(n)} dígitos`;
  }
  return errors;
}
