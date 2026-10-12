export function roundNumber(input: number, digits: number): number {
    const precision = 10**digits;
    return Math.round(input*precision)/precision;
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat('en-UK', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatPercentage(value: number) {
  return percentageFormatter.format(value);
}

const percentageFormatter = new Intl.NumberFormat('en-UK', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});