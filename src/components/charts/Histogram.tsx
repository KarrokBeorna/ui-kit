// Histogram.tsx — гистограмма (grouped / stacked) с легендой и осями.
import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { Theme } from '../../themes/theme';
import { useResponsive } from '../../context/AppContext';
import { useResizeObserver } from '../../hooks';
import { getColorById, useDismissOnOutsideTap } from './shared';

/** Строка данных гистограммы. */
export interface HistogramDataItem {
  id: string | number;
  label: string;
  value: number;
  /** Серия (по умолчанию String(id)). */
  series?: string;
  /** Цвет серии (иначе — стабильный по имени). */
  color?: string;
}

export interface HistogramProps {
  /** Данные. */
  data: HistogramDataItem[];
  /** Ширина (десктоп). @default 700 */
  width?: number;
  /** Высота (десктоп). @default 450 */
  height?: number;
  /** Тема оформления. */
  theme: Theme;
  /** Легенда. @default true */
  showLegend?: boolean;
  /** Ось X. @default true */
  showXAxis?: boolean;
  /** Ось Y. @default true */
  showYAxis?: boolean;
  /** Значения внутри баров. */
  showValues?: boolean;
  /** Подпись оси X (десктоп). */
  xAxisLabel?: string;
  /** Подпись оси Y (десктоп). */
  yAxisLabel?: string;
  /** Шрифт меток осей. @default 12 */
  axisLabelFontSize?: number;
  /** Шрифт значений. @default 12 */
  valuesFontSize?: number;
  /** Режим баров. @default 'grouped' */
  barMode?: 'stacked' | 'grouped';
  /** Сортировка сегментов stacked. @default 'none' */
  sortStackedSegments?: 'none' | 'desc' | 'asc';
  /** Шаг сетки Y (иначе — авто «красивый» шаг). */
  stepSize?: number;
  /** Зазор между группами, 0..0.8. @default 0.2 */
  groupGap?: number;
  /** Прозрачность неактивных серий. @default 0.25 */
  dimOpacity?: number;
  /** Hover/тап по бару. */
  onBarHover?: (item: HistogramDataItem | null) => void;
  /** Клик по бару. */
  onBarClick?: (item: HistogramDataItem | null) => void;
  /** Снимать выделение тапом вне. @default true */
  dismissOnOutsideTap?: boolean;
}

function getDecimalPlaces(num: number): number {
  if (!isFinite(num)) return 0;
  const s = num.toString();
  const eIdx = s.indexOf('e');
  if (eIdx >= 0) {
    const exp = parseInt(s.substring(eIdx + 1), 10);
    const mantissa = s.substring(0, eIdx);
    const dotIdx = mantissa.indexOf('.');
    const mantDecimals = dotIdx >= 0 ? mantissa.length - dotIdx - 1 : 0;
    return Math.max(0, mantDecimals - exp);
  }
  const dotIdx = s.indexOf('.');
  return dotIdx >= 0 ? s.length - dotIdx - 1 : 0;
}
const roundTo = (value: number, decimals: number) => (isFinite(value) ? Number(value.toFixed(decimals)) : value);

function groupData(data: HistogramDataItem[]) {
  const labelsSet = new Set<string>();
  const seriesSet = new Set<string>();
  const grouped = new Map<string, Map<string, number>>();
  const colorMap = new Map<string, string>();
  const sampleBySeries = new Map<string, HistogramDataItem>();
  data.forEach((item) => {
    labelsSet.add(item.label);
    const series = item.series ?? String(item.id);
    seriesSet.add(series);
    if (!sampleBySeries.has(series)) sampleBySeries.set(series, item);
  });
  labelsSet.forEach((label) => {
    const map = new Map<string, number>();
    seriesSet.forEach((series) => map.set(series, 0));
    grouped.set(label, map);
  });
  data.forEach((item) => {
    const series = item.series ?? String(item.id);
    const labelMap = grouped.get(item.label);
    if (labelMap) labelMap.set(series, (labelMap.get(series) || 0) + item.value);
    if (item.color && !colorMap.has(series)) colorMap.set(series, item.color);
  });
  seriesSet.forEach((series) => { if (!colorMap.has(series)) colorMap.set(series, getColorById(series)); });
  return {
    labels: Array.from(labelsSet), seriesSet: Array.from(seriesSet),
    grouped, colorMap, sampleBySeries,
  };
}

/** Гистограмма с подсветкой серий, авто-масштабом и адаптивом. */
export function Histogram({
  data, width = 700, height = 450, theme,
  showLegend = true, showXAxis = true, showYAxis = true, showValues = false,
  xAxisLabel, yAxisLabel, axisLabelFontSize = 12, valuesFontSize = 12,
  barMode = 'grouped', sortStackedSegments = 'none', stepSize,
  groupGap = 0.2, dimOpacity = 0.25, onBarHover, onBarClick, dismissOnOutsideTap = true,
}: HistogramProps) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredWidth } = useResizeObserver(containerRef);
  const useMeasured = isMobile && measuredWidth > 0;
  const effectiveWidth = useMeasured ? Math.max(300, measuredWidth - 16) : width;
  const effectiveHeight = useMeasured ? Math.max(260, Math.min(effectiveWidth * 0.75, 380)) : height;
  const effectiveAxisFontSize = isMobile ? Math.max(9, axisLabelFontSize - 2) : axisLabelFontSize;
  const effectiveValuesFontSize = isMobile ? Math.max(9, valuesFontSize - 2) : valuesFontSize;

  const { labels, seriesSet, grouped, colorMap, sampleBySeries } = useMemo(() => groupData(data), [data]);
  const dataMap = useMemo(() => {
    const m = new Map<string, HistogramDataItem>();
    for (const d of data) {
      const key = `${d.label}::${d.series ?? d.id}`;
      if (!m.has(key)) m.set(key, d);
    }
    return m;
  }, [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    if (barMode === 'stacked') {
      grouped.forEach((map) => {
        let sum = 0;
        map.forEach((val) => (sum += val));
        if (sum > max) max = sum;
      });
    } else {
      grouped.forEach((map) => map.forEach((val) => { if (val > max) max = val; }));
    }
    return max;
  }, [grouped, barMode]);

  const computedStepSize = useMemo(() => {
    if (stepSize && stepSize > 0) return stepSize;
    const rawStep = maxValue / (isMobile ? 4 : 6);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const normalized = rawStep / magnitude;
    const niceStep = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
    return niceStep * magnitude || 1;
  }, [maxValue, stepSize, isMobile]);
  const tickDecimals = useMemo(() => getDecimalPlaces(computedStepSize), [computedStepSize]);

  // Шкала масштабируется до верхней границы сетки — верхний тик совпадает с верхом графика.
  const yMax = Math.max(computedStepSize, Math.ceil(maxValue / computedStepSize) * computedStepSize);

  const leftMargin = useMemo(() => {
    const base = isMobile ? 40 : 60;
    if (!showYAxis) return base;
    const maxStr = String(roundTo(yMax, tickDecimals));
    const textWidth = maxStr.length * effectiveAxisFontSize * 0.6;
    const yLabelWidth = yAxisLabel && !isMobile ? effectiveAxisFontSize * 1.2 : 0;
    return Math.max(base, textWidth + yLabelWidth + 16);
  }, [showYAxis, yMax, tickDecimals, effectiveAxisFontSize, yAxisLabel, isMobile]);

  const chartWidth = effectiveWidth - leftMargin - (isMobile ? 16 : 30);
  const autoRotateXLabels = useMemo(() => {
    if (!showXAxis || labels.length === 0) return false;
    const groupWidth = chartWidth / Math.max(labels.length, 1);
    const maxLabelLen = labels.reduce((m, l) => Math.max(m, l.length), 0);
    return maxLabelLen * effectiveAxisFontSize * 0.6 > groupWidth * 0.9;
  }, [showXAxis, labels, effectiveAxisFontSize, chartWidth]);

  const margin = {
    top: isMobile ? 44 : 60, right: isMobile ? 16 : 30,
    bottom: (isMobile ? 44 : 50) + (autoRotateXLabels ? 24 : 0), left: leftMargin,
  };
  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const groupWidth = chartWidth / Math.max(labels.length, 1);
  const effectiveStep = Math.min(Math.max(groupGap, 0), 0.8);

  const setActive = useCallback((series: string | null, item: HistogramDataItem | null) => {
    setActiveSeries(series);
    onBarHover?.(item);
  }, [onBarHover]);
  useDismissOnOutsideTap(dismissOnOutsideTap, () => setActive(null, null), '[data-histogram-interactive]');

  const handleRectPointerDown = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'mouse') return;
    e.stopPropagation();
    const series = e.currentTarget.dataset.series;
    const itemKey = e.currentTarget.dataset.itemKey;
    if (!series) return;
    setActive(series, itemKey ? dataMap.get(itemKey) ?? null : null);
  }, [dataMap, setActive]);
  const handleRectPointerEnter = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return;
    const series = e.currentTarget.dataset.series;
    const itemKey = e.currentTarget.dataset.itemKey;
    if (!series) return;
    setActive(series, itemKey ? dataMap.get(itemKey) ?? null : null);
  }, [dataMap, setActive]);
  const handleRectPointerLeave = useCallback((e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return;
    setActive(null, null);
  }, [setActive]);
  const handleRectClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (!onBarClick) return;
    const itemKey = e.currentTarget.dataset.itemKey;
    onBarClick(itemKey ? dataMap.get(itemKey) ?? null : null);
  }, [dataMap, onBarClick]);

  const renderValueLabel = (value: number, barX: number, barY: number, barW: number, barH: number, key: string): React.ReactNode => {
    if (!showValues || barH <= 0 || barW <= 0) return null;
    const text = String(value);
    const fs = effectiveValuesFontSize;
    const approxTextWidth = text.length * fs * 0.6;
    const cx = barX + barW / 2, cy = barY + barH / 2;
    const common = {
      key, x: cx, y: cy + 1, textAnchor: 'middle' as const, dominantBaseline: 'central' as const,
      fontWeight: 'bold' as const, pointerEvents: 'none' as const, style: { userSelect: 'none' as const },
    };
    if (barW >= approxTextWidth + 6 && barH >= fs + 4) {
      return <text {...common} fill={theme.bgSurface} fontSize={Math.min(fs, barH * 0.8)}>{text}</text>;
    }
    if (barW >= 12 && barH >= 20) {
      return <text {...common} fill={theme.text} stroke={theme.bgSurface} strokeWidth={2} paintOrder="stroke"
        fontSize={Math.min(fs, 11)} transform={`rotate(-45 ${cx} ${cy})`}>{text}</text>;
    }
    if (barW >= fs * 0.9 && barH >= approxTextWidth + 6) {
      return <text {...common} fill={theme.text} stroke={theme.bgSurface} strokeWidth={2} paintOrder="stroke"
        fontSize={Math.min(fs, 11)} transform={`rotate(-90 ${cx} ${cy})`}>{text}</text>;
    }
    return null;
  };

  const renderBar = (label: string, series: string, value: number, x: number, y: number, w: number, h: number) => {
    const isActive = activeSeries === series;
    const opacity = activeSeries !== null ? (isActive ? 1 : dimOpacity) : 1;
    const itemKey = `${label}::${series}`;
    return (
      <rect key={`${label}-${series}`} x={x} y={y} width={w} height={h}
        fill={colorMap.get(series)!} opacity={opacity}
        stroke={theme.bgSurface} strokeWidth={1} rx={2}
        data-histogram-interactive="true" data-series={series} data-item-key={itemKey}
        onPointerDown={handleRectPointerDown} onPointerEnter={handleRectPointerEnter}
        onPointerLeave={handleRectPointerLeave} onClick={handleRectClick}
        style={{
          transition: 'opacity 0.25s ease, filter 0.25s ease',
          cursor: onBarClick ? 'pointer' : 'default', touchAction: 'manipulation',
          filter: isActive ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))' : 'none',
        }} />
    );
  };

  const renderBars = () => {
    const bars: React.ReactNode[] = [];
    labels.forEach((label, labelIndex) => {
      const xGroup = margin.left + labelIndex * groupWidth;
      const map = grouped.get(label)!;
      if (barMode === 'stacked') {
        const seriesForLabel = sortStackedSegments === 'none' ? seriesSet
          : [...seriesSet].sort((a, b) => {
            const va = map.get(a) || 0, vb = map.get(b) || 0;
            return sortStackedSegments === 'desc' ? vb - va : va - vb;
          });
        let yOffset = 0;
        const x = xGroup + groupWidth * 0.15, w = groupWidth * 0.7;
        seriesForLabel.forEach((series) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const y = margin.top + chartHeight - ((yOffset + value) / yMax) * chartHeight;
          bars.push(renderBar(label, series, value, x, y, w, barHeight));
          const labelEl = renderValueLabel(value, x, y, w, barHeight, `${label}-${series}-val`);
          if (labelEl) bars.push(labelEl);
          yOffset += value;
        });
      } else {
        const totalBarArea = groupWidth * (1 - effectiveStep);
        const innerBarWidth = totalBarArea / Math.max(seriesSet.length, 1);
        const offsetX = (groupWidth - totalBarArea) / 2;
        seriesSet.forEach((series, seriesIndex) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const x = xGroup + offsetX + seriesIndex * innerBarWidth;
          const y = margin.top + chartHeight - barHeight;
          bars.push(renderBar(label, series, value, x, y, innerBarWidth, barHeight));
          const labelEl = renderValueLabel(value, x, y, innerBarWidth, barHeight, `${label}-${series}-val`);
          if (labelEl) bars.push(labelEl);
        });
      }
    });
    return bars;
  };

  const renderXAxis = () => {
    if (!showXAxis) return null;
    const elements: React.ReactNode[] = [];
    const offsetY = autoRotateXLabels ? 4 : isMobile ? 16 : 20;
    labels.forEach((label, index) => {
      const x = margin.left + index * groupWidth + groupWidth / 2;
      const y = effectiveHeight - margin.bottom + offsetY;
      elements.push(
        <text key={`x-${label}`} x={x} y={y}
          textAnchor={autoRotateXLabels ? 'end' : 'middle'}
          fill={theme.textMuted} fontSize={effectiveAxisFontSize}
          transform={autoRotateXLabels ? `rotate(-45 ${x} ${y})` : undefined}
          style={{ userSelect: 'none' }}>
          {label}
        </text>,
      );
      elements.push(
        <line key={`xline-${label}`}
          x1={margin.left + index * groupWidth} y1={margin.top}
          x2={margin.left + index * groupWidth} y2={effectiveHeight - margin.bottom}
          stroke={theme.border} strokeWidth={0.5} strokeDasharray="4,4" />,
      );
    });
    elements.push(
      <line key="x-axis" x1={margin.left} y1={effectiveHeight - margin.bottom}
        x2={effectiveWidth - margin.right} y2={effectiveHeight - margin.bottom}
        stroke={theme.text} strokeWidth={1.5} />,
    );
    if (xAxisLabel && !isMobile) {
      elements.push(
        <text key="x-label" x={margin.left + chartWidth / 2} y={effectiveHeight - 6}
          textAnchor="middle" fill={theme.text} fontSize={effectiveAxisFontSize + 2} fontWeight="bold">
          {xAxisLabel}
        </text>,
      );
    }
    return elements;
  };

  const renderYAxis = () => {
    if (!showYAxis) return null;
    const elements: React.ReactNode[] = [];
    const tickCount = Math.max(0, Math.round(yMax / computedStepSize));
    for (let i = 0; i <= tickCount; i++) {
      const val = roundTo(i * computedStepSize, tickDecimals);
      const y = margin.top + chartHeight - (val / yMax) * chartHeight;
      elements.push(
        <text key={`y-${i}`} x={margin.left - 10} y={y + 4} textAnchor="end"
          fill={theme.textMuted} fontSize={effectiveAxisFontSize} style={{ userSelect: 'none' }}>
          {val}
        </text>,
      );
      elements.push(
        <line key={`yline-${i}`} x1={margin.left} y1={y} x2={effectiveWidth - margin.right} y2={y}
          stroke={theme.border} strokeWidth={0.5} strokeDasharray="4,4" />,
      );
    }
    elements.push(
      <line key="y-axis" x1={margin.left} y1={margin.top} x2={margin.left} y2={effectiveHeight - margin.bottom}
        stroke={theme.text} strokeWidth={1.5} />,
    );
    if (yAxisLabel && !isMobile) {
      elements.push(
        <text key="y-label" x={-margin.top - chartHeight / 2} y={effectiveAxisFontSize}
          transform="rotate(-90)" textAnchor="middle" fill={theme.text}
          fontSize={effectiveAxisFontSize + 2} fontWeight="bold">
          {yAxisLabel}
        </text>,
      );
    }
    return elements;
  };

  const renderLegend = () => {
    if (!showLegend) return null;
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', gap: isMobile ? 8 : 16,
        padding: isMobile ? '6px 10px' : '8px 16px', flexWrap: 'wrap',
        background: theme.bgSurface, borderRadius: 6, marginBottom: 8,
        border: `1px solid ${theme.border}`, maxWidth: '100%', overflow: 'hidden',
      }}>
        {seriesSet.map((series) => {
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : 0.5) : 1;
          const sampleItem = sampleBySeries.get(series) ?? null;
          return (
            <div key={series} data-histogram-interactive="true"
              onPointerDown={(e) => { if (e.pointerType === 'mouse') return; e.stopPropagation(); setActive(series, sampleItem); }}
              onPointerEnter={(e) => { if (e.pointerType === 'touch') return; setActive(series, sampleItem); }}
              onPointerLeave={(e) => { if (e.pointerType === 'touch') return; setActive(null, null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                padding: '4px 8px', borderRadius: 4,
                backgroundColor: isActive ? theme.navHoverBg : 'transparent',
                transition: 'background 0.2s, opacity 0.25s', opacity,
                touchAction: 'manipulation', maxWidth: '100%', minWidth: 0,
              }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, backgroundColor: colorMap.get(series)!, flexShrink: 0 }} />
              <span style={{ fontSize: effectiveAxisFontSize, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    <div ref={containerRef} style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}>
      {renderLegend()}
      <svg width={effectiveWidth} height={effectiveHeight}
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%', touchAction: 'manipulation' }}
        viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`} preserveAspectRatio="xMidYMid meet">
        <g>{renderYAxis()}{renderXAxis()}{renderBars()}</g>
      </svg>
    </div>
  );
}