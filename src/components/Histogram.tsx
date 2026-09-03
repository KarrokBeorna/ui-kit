import React, { useState, useMemo } from 'react';
import { Theme } from '../themes/theme';

// ─── Типы данных ──────────────────────────────────────────────

export interface HistogramDataItem {
  id: string | number;
  label: string;
  value: number;
  series?: string;
  color?: string;
}

export interface HistogramProps {
  /** Массив элементов данных (плоская структура с series) */
  data: HistogramDataItem[];
  /** Ширина диаграммы */
  width?: number;
  /** Высота диаграммы (включая легенду) */
  height?: number;
  /** Тема приложения */
  theme: Theme;
  /** Показывать ли легенду */
  showLegend?: boolean;
  /** Показывать ли ось X */
  showXAxis?: boolean;
  /** Показывать ли ось Y */
  showYAxis?: boolean;
  /** Показывать ли значения внутри баров */
  showValues?: boolean;
  /** Название оси X */
  xAxisLabel?: string;
  /** Название оси Y */
  yAxisLabel?: string;
  /** Размер шрифта label, легенды и осей */
  axisLabelFontSize?: number;
  /** Размер шрифта значений внутри баров */
  valuesFontSize?: number;
  /** Режим отображения баров - наложение или рядом */
  barMode?: 'stacked' | 'grouped';
  /** Шаг Y диапазона */
  stepSize?: number;
  /** Gap между барами в режиме 'grouped' */
  groupGap?: number;
  /** Прозрачность баров иных series во время hover'а на один из баров */
  dimOpacity?: number;
  /** Колбэк при наведении на бар */
  onBarHover?: (item: HistogramDataItem | null) => void;
}

// ─── Вспомогательные функции ──────────────────────────────────

function getColorById(id: string | number): string {
  if (typeof id === 'string' && id.startsWith('#')) return id;
  const num = typeof id === 'number' ? id : parseInt(id, 36);
  const phi = 0.618033988749895;
  const hue = (num * phi) % 1.0;
  return `hsl(${hue * 360}, 70%, 55%)`;
}

function groupData(data: HistogramDataItem[]): {
  labels: string[];
  seriesSet: string[];
  grouped: Map<string, Map<string, number>>;
  colorMap: Map<string, string>;
} {
  const labelsSet = new Set<string>();
  const seriesSet = new Set<string>();
  const grouped = new Map<string, Map<string, number>>();
  const colorMap = new Map<string, string>();

  data.forEach(item => {
    labelsSet.add(item.label);
    const series = item.series ?? String(item.id);
    seriesSet.add(series);
  });

  labelsSet.forEach(label => {
    const map = new Map<string, number>();
    seriesSet.forEach(series => map.set(series, 0));
    grouped.set(label, map);
  });

  data.forEach(item => {
    const series = item.series ?? String(item.id);
    const labelMap = grouped.get(item.label);
    if (labelMap) {
      labelMap.set(series, (labelMap.get(series) || 0) + item.value);
    }
    if (item.color && !colorMap.has(series)) {
      colorMap.set(series, item.color);
    }
  });

  seriesSet.forEach(series => {
    if (!colorMap.has(series)) {
      const seed = typeof series === 'string' ? parseInt(series, 36) : Number(series);
      colorMap.set(series, getColorById(isNaN(seed) ? series : seed));
    }
  });

  return {
    labels: Array.from(labelsSet),
    seriesSet: Array.from(seriesSet),
    grouped,
    colorMap,
  };
}

// ─── Основной компонент ──────────────────────────────────────

export function Histogram({
  data,
  width = 700,
  height = 450,
  theme,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  showValues = false,
  xAxisLabel,
  yAxisLabel,
  axisLabelFontSize = 12,
  valuesFontSize = 12,
  barMode = 'grouped',
  stepSize,
  groupGap = 0.2,
  dimOpacity = 0.25,
  onBarHover,
}: HistogramProps) {
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const { labels, seriesSet, grouped, colorMap } = useMemo(
    () => groupData(data),
    [data]
  );

  const maxValue = useMemo(() => {
    let max = 0;
    if (barMode === 'stacked') {
      labels.forEach(label => {
        const map = grouped.get(label)!;
        let sum = 0;
        map.forEach(val => sum += val);
        if (sum > max) max = sum;
      });
    } else {
      grouped.forEach(map => {
        map.forEach(val => {
          if (val > max) max = val;
        });
      });
    }
    return max;
  }, [labels, grouped, barMode]);

  const computedStepSize = useMemo(() => {
    if (stepSize && stepSize > 0) return stepSize;
    const targetTicks = 6;
    let rawStep = maxValue / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized < 1.5) niceStep = 1;
    else if (normalized < 3.5) niceStep = 2;
    else if (normalized < 7.5) niceStep = 5;
    else niceStep = 10;
    niceStep *= magnitude;
    return niceStep || 1;
  }, [maxValue, stepSize]);

  // Вычисляем необходимый отступ слева для подписей оси Y
  const leftMargin = useMemo(() => {
    if (!showYAxis) return 60;
    const maxTick = Math.ceil(maxValue / computedStepSize) * computedStepSize;
    const maxStr = String(maxTick);
    // Приблизительная ширина символа для шрифта axisLabelFontSize
    const charWidth = axisLabelFontSize * 0.6;
    const textWidth = maxStr.length * charWidth;
    // Добавляем место для подписи оси Y (если есть)
    const yLabelWidth = yAxisLabel ? axisLabelFontSize * 1.2 : 0;
    // Запас на поля и отступ от текста до оси
    return Math.max(60, textWidth + yLabelWidth + 16);
  }, [showYAxis, maxValue, computedStepSize, axisLabelFontSize, yAxisLabel]);

  const margin = {
    top: 60,
    right: 30,
    bottom: 50,
    left: leftMargin,
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const yMax = Math.max(maxValue, 1);
  const groupCount = labels.length;
  const groupWidth = chartWidth / groupCount;
  const effectiveGroupGap = Math.min(Math.max(groupGap, 0), 0.8);
  const barTotalWidth = barMode === 'grouped' ? groupWidth * (1 - effectiveGroupGap) : groupWidth * 0.7;
  const barWidth = barMode === 'grouped' ? barTotalWidth / seriesSet.length : barTotalWidth;

  const handleMouseEnter = (series: string, item: HistogramDataItem | null) => {
    setHoveredSeries(series);
    if (onBarHover) onBarHover(item);
  };

  const handleMouseLeave = () => {
    setHoveredSeries(null);
    if (onBarHover) onBarHover(null);
  };

  const renderBars = () => {
    const bars: JSX.Element[] = [];

    labels.forEach((label, labelIndex) => {
      const xGroup = margin.left + labelIndex * groupWidth;
      const map = grouped.get(label)!;

      if (barMode === 'stacked') {
        let yOffset = 0;
        seriesSet.forEach((series, seriesIndex) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const y = margin.top + chartHeight - (yOffset + value) / yMax * chartHeight;
          const color = colorMap.get(series)!;
          const isHovered = hoveredSeries === series;
          const opacity = hoveredSeries !== null ? (isHovered ? 1 : dimOpacity) : 1;

          const x = xGroup + groupWidth * 0.15;
          const w = groupWidth * 0.7;

          bars.push(
            <rect
              key={`${label}-${series}`}
              x={x}
              y={y}
              width={w}
              height={barHeight}
              fill={color}
              opacity={opacity}
              stroke={theme.bgSurface}
              strokeWidth={1}
              rx={2}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: 'pointer',
                filter: isHovered ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))' : 'none',
              }}
              onMouseEnter={() => {
                const item = data.find(d => d.label === label && (d.series ?? String(d.id)) === series) || null;
                handleMouseEnter(series, item);
              }}
              onMouseLeave={handleMouseLeave}
            />
          );

          if (showValues && barHeight > 16) {
            const textY = y + barHeight / 2 + 4;
            bars.push(
              <text
                key={`${label}-${series}-val`}
                x={x + w / 2}
                y={textY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={theme.bgSurface}
                fontSize={Math.min(valuesFontSize, barHeight * 0.8)}
                fontWeight="bold"
                pointerEvents="none"
                style={{ userSelect: 'none' }}
              >
                {value}
              </text>
            );
          }

          yOffset += value;
        });
      } else {
        // grouped
        const totalBarArea = groupWidth * (1 - effectiveGroupGap);
        const barWidth = totalBarArea / seriesSet.length;
        const offsetX = (groupWidth - totalBarArea) / 2;

        seriesSet.forEach((series, seriesIndex) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const x = xGroup + offsetX + seriesIndex * barWidth;
          const y = margin.top + chartHeight - barHeight;
          const color = colorMap.get(series)!;
          const isHovered = hoveredSeries === series;
          const opacity = hoveredSeries !== null ? (isHovered ? 1 : dimOpacity) : 1;

          bars.push(
            <rect
              key={`${label}-${series}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              opacity={opacity}
              stroke={theme.bgSurface}
              strokeWidth={1}
              rx={2}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: 'pointer',
                filter: isHovered ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))' : 'none',
              }}
              onMouseEnter={() => {
                const item = data.find(d => d.label === label && (d.series ?? String(d.id)) === series) || null;
                handleMouseEnter(series, item);
              }}
              onMouseLeave={handleMouseLeave}
            />
          );

          if (showValues && barHeight > 16) {
            const textX = x + barWidth / 2;
            const textY = y + barHeight / 2 + 4;
            bars.push(
              <text
                key={`${label}-${series}-val`}
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={theme.bgSurface}
                fontSize={Math.min(valuesFontSize, barHeight * 0.8)}
                fontWeight="bold"
                pointerEvents="none"
                style={{ userSelect: 'none' }}
              >
                {value}
              </text>
            );
          }
        });
      }
    });

    return bars;
  };

  const renderXAxis = () => {
    if (!showXAxis) return null;
    const elements: JSX.Element[] = [];

    labels.forEach((label, index) => {
      const x = margin.left + index * groupWidth + groupWidth / 2;
      elements.push(
        <text
          key={`x-${label}`}
          x={x}
          y={height - margin.bottom + 20}
          textAnchor="middle"
          fill={theme.textMuted}
          fontSize={axisLabelFontSize}
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      );
      elements.push(
        <line
          key={`xline-${label}`}
          x1={margin.left + index * groupWidth}
          y1={margin.top}
          x2={margin.left + index * groupWidth}
          y2={height - margin.bottom}
          stroke={theme.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      );
    });

    elements.push(
      <line
        key="x-axis"
        x1={margin.left}
        y1={height - margin.bottom}
        x2={width - margin.right}
        y2={height - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );

    if (xAxisLabel) {
      elements.push(
        <text
          key="x-label"
          x={margin.left + chartWidth / 2}
          y={height - 6}
          textAnchor="middle"
          fill={theme.text}
          fontSize={axisLabelFontSize + 2}
          fontWeight="bold"
        >
          {xAxisLabel}
        </text>
      );
    }

    return elements;
  };

  const renderYAxis = () => {
    if (!showYAxis) return null;
    const elements: JSX.Element[] = [];
    const maxTick = Math.ceil(yMax / computedStepSize) * computedStepSize;
    for (let val = 0; val <= maxTick; val += computedStepSize) {
      const y = margin.top + chartHeight - (val / yMax) * chartHeight;
      elements.push(
        <text
          key={`y-${val}`}
          x={margin.left - 10}
          y={y + 4}
          textAnchor="end"
          fill={theme.textMuted}
          fontSize={axisLabelFontSize}
          style={{ userSelect: 'none' }}
        >
          {val}
        </text>
      );
      elements.push(
        <line
          key={`yline-${val}`}
          x1={margin.left}
          y1={y}
          x2={width - margin.right}
          y2={y}
          stroke={theme.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      );
    }
    elements.push(
      <line
        key="y-axis"
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={height - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );
    if (yAxisLabel) {
      elements.push(
        <text
          key="y-label"
          x={-margin.top - chartHeight / 2}
          y={axisLabelFontSize}
          transform="rotate(-90)"
          textAnchor="middle"
          fill={theme.text}
          fontSize={axisLabelFontSize + 2}
          fontWeight="bold"
        >
          {yAxisLabel}
        </text>
      );
    }
    return elements;
  };

  const renderLegend = () => {
    if (!showLegend) return null;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          padding: '8px 16px',
          flexWrap: 'wrap',
          background: theme.bgSurface,
          borderRadius: 6,
          marginBottom: 8,
          border: `1px solid ${theme.border}`,
        }}
      >
        {seriesSet.map(series => {
          const color = colorMap.get(series)!;
          const isHovered = hoveredSeries === series;
          const opacity = hoveredSeries !== null ? (isHovered ? 1 : 0.5) : 1;

          return (
            <div
              key={series}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: isHovered ? theme.navHoverBg : 'transparent',
                transition: 'background 0.2s, opacity 0.25s',
                opacity,
              }}
              onMouseEnter={() => handleMouseEnter(series, null)}
              onMouseLeave={handleMouseLeave}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: axisLabelFontSize, color: theme.text }}>
                {series}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: theme.textMuted }}>Нет данных</div>;
  }

  return (
    <div>
      {renderLegend()}
      <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
        <g>
          {renderYAxis()}
          {renderXAxis()}
          {renderBars()}
        </g>
      </svg>
    </div>
  );
}