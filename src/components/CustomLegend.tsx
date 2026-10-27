import type { ColorEntry, ModelType } from '../types'

interface CustomLegendProps<T extends string> {
    seriesOrder: Array<T>;
    colorMap: Record<T, ColorEntry>;
    nameMap: Record<T, string>;
    activeForecast?: T;
}

export function CustomLegend<T extends string>({seriesOrder, colorMap, nameMap, activeForecast}: CustomLegendProps<T>) {
    return (
        <ul style={{ display: 'flex', gap: '12px', fontSize: '12px', padding: 0, listStyle: 'none', justifyContent: 'center' }}>
            {seriesOrder.map((key) => (
                <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 10, height: 10,
                        display: 'inline-block',
                        // border: `1px ${ nameMap[key] === activeForecast ? 'solid' : 'solid'} ${colorMap[key]}`,
                        backgroundColor: colorMap[key].color,
                        opacity: colorMap[key].opacity
                    }} />
                    {nameMap[key]}
                </li>
            ))}
        </ul>
    );
}