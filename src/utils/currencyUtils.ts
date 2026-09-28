export function formatCurrencyValues<T extends object>(
  obj: T,
  excludedKeys: (keyof T)[] = []
): Record<keyof T, string | number> {
  const result = { ...obj } as Record<keyof T, string | number>;

  for (const key in obj) {
    const typedKey = key as keyof T;
    const val = obj[typedKey];

    if (typeof val === 'number' && !excludedKeys.includes(typedKey)) {
      result[typedKey] = currencyFormatter.format(val);
    }
  }

  return result;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});