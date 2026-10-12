export function formatCurrencyValues<T extends object>(
  obj: T,
  excludedKeys: (keyof T)[] = []
): Record<keyof T, string | number> {
  const result = { ...obj } as Record<keyof T, string | number>;

  for (const key in obj) {
    const typedKey = key as keyof T;
    const val = obj[typedKey];

    if (typeof val === 'number' && !excludedKeys.includes(typedKey)) {
      result[typedKey] = formatCurrencyValue(val);
    }
  }

  return result;
}

export function formatCurrencyValue(value: number) {
  return currencyFormatter.format(value);
}

const currencyFormatter = new Intl.NumberFormat('en-UK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});