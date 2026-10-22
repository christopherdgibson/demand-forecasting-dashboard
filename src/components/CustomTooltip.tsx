import { TooltipContentProps } from 'recharts';

import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { formatCurrencyValue } from '../utils/currencyUtils';
import styles from './Controls/Controls.module.css';

interface CustomTooltipProps<T extends string> {
  props: TooltipContentProps<ValueType, NameType>;
  seriesOrder: Array<T>;
  formatType?: string;
  colorMap?: Record<T, string>;
  nameMap?: Record<T, string>;
}

export function CustomTooltip<T extends string>({props, seriesOrder, formatType}: CustomTooltipProps<T>) {
  const { active, payload, label } = props;

  if (!active || !payload?.length) return null;

  const sorted = [...payload].sort(
    (a, b) =>
      seriesOrder.indexOf(a.dataKey as T) -
      seriesOrder.indexOf(b.dataKey as T)
  );

  return (
    <div className={styles.tooltip}>
      <p>{label}</p>
      {sorted.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {Array.isArray(entry.value)
            ? entry.value[0] === undefined
              ? 'N/A'
              : formatType === 'currency'
                ? `${formatCurrencyValue(entry.value[0])} - ${formatCurrencyValue(entry.value[1])}`
                : `${entry.value[0]} - ${entry.value[1]}`
            :
              typeof entry.value === 'number'
              ? formatType === 'currency'
                ? formatCurrencyValue(entry.value)
                : entry.value
              : ''
          }
        </p>
      ))}
    </div>
  );
}
