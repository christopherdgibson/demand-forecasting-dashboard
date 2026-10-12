export function roundNumber(input: number, digits: number): number {
    const precision = 10**digits;
    return Math.round(input*precision)/precision;
}

export function formatNumber(value: number) {
    if (typeof value !== 'number') return null;
    return numberFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat('en-UK', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatPercentage(value: number) {
    if (typeof value !== 'number') return null;
  return percentageFormatter.format(value);
}

const percentageFormatter = new Intl.NumberFormat('en-UK', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});