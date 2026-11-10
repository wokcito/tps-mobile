export interface ShippingForm {
  name: string;
  address: string;
  city: string;
  zip: string;
}

export type ShippingErrors = Partial<Record<keyof ShippingForm, string>>;

export function validateShipping(f: ShippingForm): ShippingErrors {
  const e: ShippingErrors = {};
  if (f.name.trim().length < 3) e.name = 'Ingresá tu nombre completo';
  if (f.address.trim().length < 5) e.address = 'Ingresá una dirección válida';
  if (f.city.trim().length < 2) e.city = 'Ingresá la ciudad';
  if (!/^[A-Za-z0-9 -]{4,8}$/.test(f.zip.trim())) e.zip = 'Código postal inválido';
  return e;
}
