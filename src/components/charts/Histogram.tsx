import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Theme } from '../../themes/theme';
import { useResponsive } from '../../context/ResponsiveContext';
import { useResizeObserver } from './_shared/useResizeObserver';
import { useDismissOnOutsideTap } from './_shared/useDismissOnOutsideTap';
import { getColorById } from './_shared/color';

// ─── Типы данных ──────────────────────────────────────────────

export interface HistogramDataItem {
  id: string | number;
  label: string;
  value: number;
  series?: string;
  color?: string;
}

export interface HistogramProps {
  data: HistogramDataItem[];
  width?: number;
  height?: number;
  theme: Theme;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showValues?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  axisLabelFontSize?: number;
  valuesFontSize?: number;
  barMode?: 'stacked' | 'grouped';
  sortStackedSegments?: 'none' | 'desc' | 'asc';
  stepSize?: number;
  groupGap?: number;
  dimOpacity?: number;
  onBarHover?: (item: HistogramDataItem | null) => void;
  onBarClick?: (item: HistogramDataItem | null) => void;
  dismissOnOutsideTap?: boolean;
}

// ─── Вспомогательные ──────────────────────────────────────────

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

function roundToDecimals(value: number, decimals: number): number {
  if (!isFinite(value)) return value;
  return Number(value.toFixed(decimals));
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

  data.forEach((item) => {
    labelsSet.add(item.label);
    const series = item.series ?? String(item.id);
    seriesSet.add(series);
  });

  labelsSet.forEach((label) => {
    const map = new Map<string, number>();
    seriesSet.forEach((series) => map.set(series, 0));
    grouped.set(label, map);
  });

  data.forEach((item) => {
    const series = item.series ?? String(item.id);
    const labelMap = grouped.get(item.label);
    if (labelMap) {
      labelMap.set(series, (labelMap.get(series) || 0) + item.value);
    }
    if (item.color && !colorMap.has(series)) {
      colorMap.set(series, item.color);
    }
  });

  seriesSet.forEach((series) => {
    if (!colorMap.has(series)) {
      colorMap.set(series, getColorById(series));
    }
  });

  return {
    labels: Array.from(labelsSet),
    seriesSet: Array.from(seriesSet),
    grouped,
    colorMap,
  };
}

/** Ключ, по которому ищется «репрезентативный» item для пары (label, series). */
function dataKey(d: HistogramDataItem): string {
  return `${d.label}::${d.series ?? d.id}`;
}

// ─── Компонент ────────────────────────────────────────────────

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
  sortStackedSegments = 'none',
  stepSize,
  groupGap = 0.2,
  dimOpacity = 0.25,
  onBarHover,
  onBarClick,
  dismissOnOutsideTap = true,
}: HistogramProps) {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredWidth } = useResizeObserver(containerRef);

  const useMeasured = isMobile && measuredWidth > 0;
  const effectiveWidth = useMeasured ? Math.max(300, measuredWidth - 16) : width;
  const effectiveHeight = useMeasured
    ? Math.max(260, Math.min(effectiveWidth * 0.75, 380))
    : height;

  const effectiveAxisFontSize = isMobile
    ? Math.max(9, axisLabelFontSize - 2)
    : axisLabelFontSize;
  const effectiveValuesFontSize = isMobile
    ? Math.max(9, valuesFontSize - 2)
    : valuesFontSize;

  const { labels, seriesSet, grouped, colorMap } = useMemo(
    () => groupData(data),
    [data]
  );

  // O(1)-поиск «репрезентативного» item по (label, series)
  const dataMap = useMemo(() => {
    const m = new Map<string, HistogramDataItem>();
    for (const d of data) {
      const key = dataKey(d);
      if (!m.has(key)) m.set(key, d);
    }
    return m;
  }, [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    if (barMode === 'stacked') {
      labels.forEach((label) => {
        const map = grouped.get(label)!;
        let sum = 0;
        map.forEach((val) => (sum += val));
        if (sum > max) max = sum;
      });
    } else {
      grouped.forEach((map) => {
        map.forEach((val) => {
          if (val > max) max = val;
        });
      });
    }
    return max;
  }, [labels, grouped, barMode]);

  const computedStepSize = useMemo(() => {
    if (stepSize && stepSize > 0) return stepSize;
    const targetTicks = isMobile ? 4 : 6;
    const rawStep = maxValue / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized < 1.5) niceStep = 1;
    else if (normalized < 3.5) niceStep = 2;
    else if (normalized < 7.5) niceStep = 5;
    else niceStep = 10;
    niceStep *= magnitude;
    return niceStep || 1;
  }, [maxValue, stepSize, isMobile]);

  const tickDecimals = useMemo(
    () => getDecimalPlaces(computedStepSize),
    [computedStepSize]
  );

  const leftMargin = useMemo(() => {
    const base = isMobile ? 40 : 60;
    if (!showYAxis) return base;
    const maxTick = roundToDecimals(
      Math.ceil(maxValue / computedStepSize) * computedStepSize,
      tickDecimals
    );
    const maxStr = String(maxTick);
    const charWidth = effectiveAxisFontSize * 0.6;
    const textWidth = maxStr.length * charWidth;
    const yLabelWidth = yAxisLabel && !isMobile ? effectiveAxisFontSize * 1.2 : 0;
    return Math.max(base, textWidth + yLabelWidth + 16);
  }, [
    showYAxis,
    maxValue,
    computedStepSize,
    tickDecimals,
    effectiveAxisFontSize,
    yAxisLabel,
    isMobile,
  ]);

  const chartWidth = effectiveWidth - leftMargin - (isMobile ? 16 : 30);

  // Авто-поворот X-меток: если самая длинная не влезает в колонку
  const autoRotateXLabels = useMemo(() => {
    if (!showXAxis || labels.length === 0) return false;
    const groupWidth = chartWidth / Math.max(labels.length, 1);
    const maxLabelLen = labels.reduce((m, l) => Math.max(m, l.length), 0);
    return maxLabelLen * effectiveAxisFontSize * 0.6 > groupWidth * 0.9;
  }, [showXAxis, labels, effectiveAxisFontSize, chartWidth]);

  const margin = {
    top: isMobile ? 44 : 60,
    right: isMobile ? 16 : 30,
    bottom: (isMobile ? 44 : 50) + (autoRotateXLabels ? 24 : 0),
    left: leftMargin,
  };

  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const yMax = Math.max(maxValue, 1);
  const groupCount = labels.length;
  const groupWidth = chartWidth / Math.max(groupCount, 1);
  const effectiveGroupGap = Math.min(Math.max(groupGap, 0), 0.8);
  const effectiveStep = effectiveGroupGap;

  const setActive = useCallback(
    (series: string | null, item: HistogramDataItem | null) => {
      setActiveSeries(series);
      onBarHover?.(item);
    },
    [onBarHover]
  );

  useDismissOnOutsideTap(dismissOnOutsideTap, () => setActive(null, null), {
    selector: '[data-histogram-interactive]',
  });

  // ─── Единые handlers по data-* (не пересоздаются на каждый рендер) ────
  const handleRectPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();
      const series = e.currentTarget.dataset.series;
      const itemKey = e.currentTarget.dataset.itemKey;
      if (!series) return;
      setActive(series, itemKey ? dataMap.get(itemKey) ?? null : null);
    },
    [dataMap, setActive]
  );

  const handleRectPointerEnter = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === 'touch') return;
      const series = e.currentTarget.dataset.series;
      const itemKey = e.currentTarget.dataset.itemKey;
      if (!series) return;
      setActive(series, itemKey ? dataMap.get(itemKey) ?? null : null);
    },
    [dataMap, setActive]
  );

  const handleRectPointerLeave = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === 'touch') return;
      setActive(null, null);
    },
    [setActive]
  );

  const handleRectClick = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (!onBarClick) return;
      const itemKey = e.currentTarget.dataset.itemKey;
      onBarClick(itemKey ? dataMap.get(itemKey) ?? null : null);
    },
    [dataMap, onBarClick]
  );

  // ─── Рендер значения внутри бара ───────────────────────────
  const renderValueLabel = (
    value: number,
    barX: number,
    barY: number,
    barW: number,
    barH: number,
    key: string
  ): React.ReactNode => {
    if (!showValues || barH <= 0 || barW <= 0) return null;

    const text = String(value);
    const fs = effectiveValuesFontSize;
    const approxTextWidth = text.length * fs * 0.6;
    const cx = barX + barW / 2;
    const cy = barY + barH / 2;

    if (barW >= approxTextWidth + 6 && barH >= fs + 4) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.bgSurface}
          fontSize={Math.min(fs, barH * 0.8)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {text}
        </text>
      );
    }

    if (barW >= 12 && barH >= 20) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.text}
          stroke={theme.bgSurface}
          strokeWidth={2}
          paintOrder="stroke"
          fontSize={Math.min(fs, 11)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={`rotate(-45 ${cx} ${cy})`}
        >
          {text}
        </text>
      );
    }

    if (barW >= fs * 0.9 && barH >= approxTextWidth + 6) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.text}
          stroke={theme.bgSurface}
          strokeWidth={2}
          paintOrder="stroke"
          fontSize={Math.min(fs, 11)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={`rotate(-90 ${cx} ${cy})`}
        >
          {text}
        </text>
      );
    }

    return null;
  };

  const renderBars = () => {
    const bars: React.ReactNode[] = [];

    labels.forEach((label, labelIndex) => {
      const xGroup = margin.left + labelIndex * groupWidth;
      const map = grouped.get(label)!;

      if (barMode === 'stacked') {
        const seriesForLabel =
          sortStackedSegments === 'none'
            ? seriesSet
            : [...seriesSet].sort((a, b) => {
                const va = map.get(a) || 0;
                const vb = map.get(b) || 0;
                return sortStackedSegments === 'desc' ? vb - va : va - vb;
              });

        let yOffset = 0;
        seriesForLabel.forEach((series) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const y =
            margin.top + chartHeight - ((yOffset + value) / yMax) * chartHeight;
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : dimOpacity) : 1;

          const x = xGroup + groupWidth * 0.15;
          const w = groupWidth * 0.7;
          const itemKey = `${label}::${series}`;

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
              data-histogram-interactive="true"
              data-series={series}
              data-item-key={itemKey}
              onPointerDown={handleRectPointerDown}
              onPointerEnter={handleRectPointerEnter}
              onPointerLeave={handleRectPointerLeave}
              onClick={handleRectClick}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: onBarClick ? 'pointer' : 'default',
                touchAction: 'manipulation',
                filter: isActive
                  ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))'
                  : 'none',
              }}
            />
          );

          const labelEl = renderValueLabel(
            value,
            x,
            y,
            w,
            barHeight,
            `${label}-${series}-val`
          );
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
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : dimOpacity) : 1;
          const itemKey = `${label}::${series}`;

          bars.push(
            <rect
              key={`${label}-${series}`}
              x={x}
              y={y}
              width={innerBarWidth}
              height={barHeight}
              fill={color}
              opacity={opacity}
              stroke={theme.bgSurface}
              strokeWidth={1}
              rx={2}
              data-histogram-interactive="true"
              data-series={series}
              data-item-key={itemKey}
              onPointerDown={handleRectPointerDown}
              onPointerEnter={handleRectPointerEnter}
              onPointerLeave={handleRectPointerLeave}
              onClick={handleRectClick}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: onBarClick ? 'pointer' : 'default',
                touchAction: 'manipulation',
                filter: isActive
                  ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))'
                  : 'none',
              }}
            />
          );

          const labelEl = renderValueLabel(
            value,
            x,
            y,
            innerBarWidth,
            barHeight,
            `${label}-${series}-val`
          );
          if (labelEl) bars.push(labelEl);
        });
      }
    });

    return bars;
  };

  const renderXAxis = () => {
    if (!showXAxis) return null;
    const elements: React.ReactNode[] = [];
    const offsetY = autoRotateXLabels
      ? 4
      : isMobile
        ? 16
        : 20;

    labels.forEach((label, index) => {
      const x = margin.left + index * groupWidth + groupWidth / 2;
      const y = effectiveHeight - margin.bottom + offsetY;

      if (autoRotateXLabels) {
        elements.push(
          <text
            key={`x-${label}`}
            x={x}
            y={y}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize={effectiveAxisFontSize}
            transform={`rotate(-45 ${x} ${y})`}
            style={{ userSelect: 'none' }}
          >
            {label}
          </text>
        );
      } else {
        elements.push(
          <text
            key={`x-${label}`}
            x={x}
            y={y}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={effectiveAxisFontSize}
            style={{ userSelect: 'none' }}
          >
            {label}
          </text>
        );
      }

      elements.push(
        <line
          key={`xline-${label}`}
          x1={margin.left + index * groupWidth}
          y1={margin.top}
          x2={margin.left + index * groupWidth}
          y2={effectiveHeight - margin.bottom}
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
        y1={effectiveHeight - margin.bottom}
        x2={effectiveWidth - margin.right}
        y2={effectiveHeight - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );

    if (xAxisLabel && !isMobile) {
      elements.push(
        <text
          key="x-label"
          x={margin.left + chartWidth / 2}
          y={effectiveHeight - 6}
          textAnchor="middle"
          fill={theme.text}
          fontSize={effectiveAxisFontSize + 2}
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
    const elements: React.ReactNode[] = [];

    const rawMaxTick = Math.ceil(yMax / computedStepSize) * computedStepSize;
    const tickCount = Math.max(0, Math.round(rawMaxTick / computedStepSize));

    for (let i = 0; i <= tickCount; i++) {
      const val = roundToDecimals(i * computedStepSize, tickDecimals);
      const y = margin.top + chartHeight - (val / yMax) * chartHeight;

      elements.push(
        <text
          key={`y-${i}`}
          x={margin.left - 10}
          y={y + 4}
          textAnchor="end"
          fill={theme.textMuted}
          fontSize={effectiveAxisFontSize}
          style={{ userSelect: 'none' }}
        >
          {val}
        </text>
      );
      elements.push(
        <line
          key={`yline-${i}`}
          x1={margin.left}
          y1={y}
          x2={effectiveWidth - margin.right}
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
        y2={effectiveHeight - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );

    if (yAxisLabel && !isMobile) {
      elements.push(
        <text
          key="y-label"
          x={-margin.top - chartHeight / 2}
          y={effectiveAxisFontSize}
          transform="rotate(-90)"
          textAnchor="middle"
          fill={theme.text}
          fontSize={effectiveAxisFontSize + 2}
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
          gap: isMobile ? 8 : 16,
          padding: isMobile ? '6px 10px' : '8px 16px',
          flexWrap: 'wrap',
          background: theme.bgSurface,
          borderRadius: 6,
          marginBottom: 8,
          border: `1px solid ${theme.border}`,
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {seriesSet.map((series) => {
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : 0.5) : 1;
          const sampleItem =
            dataMap.get(series) ??
            data.find((d) => (d.series ?? String(d.id)) === series) ??
            null;

          return (
            <div
              key={series}
              data-histogram-interactive="true"
              onPointerDown={(e) => {
                if (e.pointerType === 'mouse') return;
                e.stopPropagation();
                setActive(series, sampleItem);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === 'touch') return;
                setActive(series, sampleItem);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'touch') return;
                setActive(null, null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: isActive ? theme.navHoverBg : 'transparent',
                transition: 'background 0.2s, opacity 0.25s',
                opacity,
                touchAction: 'manipulation',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: effectiveAxisFontSize,
                  color: theme.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {series}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: theme.textMuted }}>
        Нет данных
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
    >
      {renderLegend()}
      <svg
        width={effectiveWidth}
        height={effectiveHeight}
        style={{
          display: 'block',
          margin: '0 auto',
          maxWidth: '100%',
          touchAction: 'manipulation',
        }}
        viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {renderYAxis()}
          {renderXAxis()}
          {renderBars()}
        </g>
      </svg>
    </div>
  );
}