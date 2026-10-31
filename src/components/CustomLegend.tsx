import type { ColorStyle } from '../types'

interface CustomLegendProps<T extends string> {
    seriesOrder: Array<T>;
    colorMap: Record<T, ColorStyle>;
    nameMap: Record<T, string>;
}

export function CustomLegend<T extends string>({seriesOrder, colorMap, nameMap}: CustomLegendProps<T>) {
    return (
        <ul style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12,
            padding: 0, margin: 0, listStyle: 'none', justifyContent: 'center',
            color: 'var(--text-muted)' }}
        >
            {seriesOrder.map((key) => (
                <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LegendSwatch style={colorMap[key]} />
                    <span>{nameMap[key]}</span>
                </li>
            ))}
        </ul>
    );
}

function LegendSwatch({ style }: { style: ColorStyle }) {
    return (
        <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden="true">
            {style.shape === 'area' ? (
                <rect x="0" y="1" width="30" height="8" rx="2"
                    fill={style.color} fillOpacity={style.opacity ?? 0.2}
                    stroke={style.color} strokeOpacity={0.5}
                />
            ) : (
                <line x1="0" y1="5" x2="30" y2="5"
                    stroke={style.color} strokeWidth={2}
                    strokeDasharray={style.dash}
                />
            )}
        </svg>
    );
}
